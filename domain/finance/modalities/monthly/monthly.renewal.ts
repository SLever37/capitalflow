
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
    // Nota: Mensal geralmente segue ciclo fixo, mas poderia usar manualDate para renegociação de data.
    // Por hora, mantemos a lógica original de +30 dias, mas respeitamos a interface.
    
    const currentDueDate = parseDateOnlyUTC(inst.dueDate);
    const daysLate = getDaysDiff(inst.dueDate); 
    
    let baseDate: Date;
    
    if (manualDate) {
        baseDate = manualDate;
    } else if (daysLate > 0 && !forgivePenalty) {
        baseDate = today;
    } else {
        baseDate = currentDueDate;
    }

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
