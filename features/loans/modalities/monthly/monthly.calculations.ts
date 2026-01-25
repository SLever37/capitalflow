
import { LoanStatus, Installment } from '../../../../types';
import { addDaysUTC, parseDateOnlyUTC } from '../../../../utils/dateHelpers';
import { generateUUID } from '../../../../utils/generators';

export const calculateMonthlyInstallments = (
  principal: number,
  rate: number,
  startDateStr: string,
  existingId?: string
): { installments: Installment[], totalToReceive: number } => {
  const baseDate = parseDateOnlyUTC(startDateStr);
  
  // MENSAL: Juros Simples (Principal * Taxa)
  const scheduledInterest = principal * (rate / 100);
  const totalToReceive = principal + scheduledInterest;
  
  // Vencimento: +30 dias
  const dueDate = addDaysUTC(baseDate, 30);
  
  const installment: Installment = {
    id: existingId || generateUUID(),
    dueDate: dueDate.toISOString(),
    amount: parseFloat(totalToReceive.toFixed(2)),
    scheduledPrincipal: parseFloat(principal.toFixed(2)),
    scheduledInterest: parseFloat(scheduledInterest.toFixed(2)),
    principalRemaining: parseFloat(principal.toFixed(2)),
    interestRemaining: parseFloat(scheduledInterest.toFixed(2)),
    lateFeeAccrued: 0,
    avApplied: 0,
    paidPrincipal: 0,
    paidInterest: 0,
    paidLateFee: 0,
    paidTotal: 0,
    status: LoanStatus.PENDING,
    logs: []
  };

  return {
    installments: [installment],
    totalToReceive
  };
};
