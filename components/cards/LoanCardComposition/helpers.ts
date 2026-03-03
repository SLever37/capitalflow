import { Loan, Installment } from '../../../types';
import { asString } from '../../../utils/safe';
import { getDaysDiff } from '../../../utils/dateHelpers';

export const getDebtorNameSafe = (loan: Loan) =>
  asString(loan.debtorName, 'Sem Nome');

export const getNextInstallment = (orderedInstallments: Installment[]) => {
  return orderedInstallments.find(i => i.status !== 'PAID');
};

export const getNextDueDate = (nextInstallment?: Installment) => {
  return nextInstallment ? nextInstallment.dueDate : null;
};

/**
 * REGRA FINAL (compatível com Header):
 *  > 0  → faltam dias
 *  = 0  → vence hoje
 *  < 0  → vencido
 */
export const getDaysUntilDue = (
  nextDueDate: string | null | undefined
) => {
  if (!nextDueDate) return 0;

  // getDaysDiff = hoje - vencimento
  // invertendo para: vencimento - hoje
  return -getDaysDiff(nextDueDate);
};