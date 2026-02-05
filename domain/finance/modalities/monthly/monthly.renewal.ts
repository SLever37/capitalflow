
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
    
    const currentDueDate = parseDateOnlyUTC(inst.dueDate);
    const daysLate = getDaysDiff(inst.dueDate); 
    
    // Verifica se houve amortização do principal (Pagar Tudo / Abater)
    const isPrincipalPayment = (Number(allocation?.principalPaid) || 0) > 0;

    let baseDate: Date;
    
    if (manualDate) {
        baseDate = manualDate;
    } else if (daysLate > 0 && isPrincipalPayment) {
        // Se pagou atrasado E abateu o principal, reseta para hoje
        baseDate = today;
    } else {
        // Se pagou em dia OU apenas juros (Renovação), mantém o ciclo original
        baseDate = currentDueDate;
    }

    // No Mensal, sempre joga 30 dias para frente
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
