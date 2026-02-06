
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
    
    // Data de vencimento atual da parcela (Fonte da Verdade)
    const currentDueDate = parseDateOnlyUTC(inst.dueDate);
    const daysLate = getDaysDiff(inst.dueDate); 
    
    // Verifica se houve amortização do principal
    const isPrincipalPayment = (Number(allocation?.principalPaid) || 0) > 0;

    let baseDate: Date;
    
    if (manualDate) {
        // Se o usuário escolheu uma data, respeita
        baseDate = manualDate;
    } else if (daysLate > 0 && isPrincipalPayment) {
        // Se pagou atrasado E abateu o principal (renegociação implícita), reseta o ciclo para hoje
        baseDate = today;
    } else {
        // Renovação Padrão (pagamento de juros):
        // SEMPRE usa a data de vencimento original como base para manter o ciclo mensal perfeito.
        // Isso evita que pagar atrasado ou adiantado mova o vencimento para uma data errada (ex: pular 2 meses)
        baseDate = currentDueDate;
    }

    // No Mensal, sempre joga 30 dias para frente a partir da base
    // Se a base for Jan 01, vai para Jan 31/Fev 01. Se a base for "Hoje" (em atraso amortizado), vai +30 de hoje.
    const newStartDateISO = toISODateOnlyUTC(baseDate); 
    const newDueDateISO = toISODateOnlyUTC(addDaysUTC(baseDate, 30));

    const currentPrincipalRemaining = Number(inst.principalRemaining) || 0;
    const principalPaidNow = (Number(allocation?.principalPaid) || 0) + (Number(allocation?.avGenerated) || 0);

    const newPrincipalRemaining = Math.max(0, currentPrincipalRemaining - principalPaidNow);
    
    // Projeta o próximo juro (Mês cheio)
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
