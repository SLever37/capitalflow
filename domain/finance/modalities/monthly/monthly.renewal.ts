
import { Loan, Installment } from "@/types";
import { parseDateOnlyUTC, toISODateOnlyUTC, addDaysUTC, getDaysDiff, todayDateOnlyUTC } from "@/utils/dateHelpers";
import { RenewalResult, PaymentAllocation } from "../types";

export const renewMonthly = (
    loan: Loan, 
    inst: Installment, 
    amountPaid: number, 
    allocation: PaymentAllocation, 
    today: Date = todayDateOnlyUTC(), 
    forgivePenalty: boolean = false,
    manualDate?: Date | null
): RenewalResult => {
    
    // Data de vencimento atual registrada no contrato
    const currentDueDate = parseDateOnlyUTC(inst.dueDate);
    const daysLate = getDaysDiff(inst.dueDate); 
    
    let baseDate: Date;
    
    if (manualDate) {
        // 1. Data Manual (Soberania do operador)
        baseDate = manualDate;
    } else if (daysLate > 0 && (Number(allocation?.principalPaid) || 0) > 0) {
        // 2. Atraso com amortização: reseta o ciclo para hoje (renegociação implícita)
        baseDate = today;
    } else {
        // 3. Pagamento de Juros (Renovação Padrão):
        // Sempre avança 30 dias EM CIMA da data teórica de vencimento.
        // Isso impede que, se o cliente pagar adiantado 10 dias, ele "perca" esses 10 dias de juros.
        baseDate = currentDueDate;
    }

    // Calcula o novo início e novo vencimento (Ciclo de 30 dias)
    const newStartDateISO = toISODateOnlyUTC(baseDate); 
    const newDueDateISO = toISODateOnlyUTC(addDaysUTC(baseDate, 30));

    const currentPrincipalRemaining = Number(inst.principalRemaining) || 0;
    const principalPaidNow = (Number(allocation?.principalPaid) || 0) + (Number(allocation?.avGenerated) || 0);
    const newPrincipalRemaining = Math.max(0, currentPrincipalRemaining - principalPaidNow);
    
    // O próximo juro é projetado sobre o novo saldo para o mês seguinte
    const nextMonthInterest = newPrincipalRemaining * (loan.interestRate / 100);
    
    return {
        newStartDateISO,
        newDueDateISO,
        newPrincipalRemaining,
        newInterestRemaining: nextMonthInterest,
        newScheduledPrincipal: newPrincipalRemaining,
        newScheduledInterest: nextMonthInterest,
        newAmount: newPrincipalRemaining + nextMonthInterest
    };
};
