
import { Loan, Installment } from '../../../types';
import { asString } from '../../../utils/safe';
import { getDaysDiff } from '../../../utils/dateHelpers';

export const getDebtorNameSafe = (loan: Loan) => asString(loan.debtorName, 'Sem Nome');

export const getNextInstallment = (orderedInstallments: Installment[]) => {
    return orderedInstallments.find(i => i.status !== 'PAID');
};

export const getNextDueDate = (nextInstallment?: Installment) => {
    return nextInstallment ? nextInstallment.dueDate : null;
};

export const getDaysUntilDue = (nextDueDate: string | null | undefined) => {
    return nextDueDate ? getDaysDiff(nextDueDate) : 0;
};
