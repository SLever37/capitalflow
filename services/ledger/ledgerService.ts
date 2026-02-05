// services/ledger/ledgerService.ts
import { Loan, UserProfile, CapitalSource, LedgerEntry } from '../../types';
import { executeLedgerAction } from './ledgerActions';
import { reverseTransaction } from './ledgerReverse';

export const ledgerService = {
  executeLedgerAction(params: {
    type: 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'DELETE_CLIENT' | 'DELETE_SOURCE';
    targetId: string;
    loan?: Loan;
    activeUser: UserProfile;
    sources: CapitalSource[];
    refundChecked: boolean;
  }) {
    return executeLedgerAction(params);
  },

  reverseTransaction(transaction: LedgerEntry, activeUser: UserProfile, loan: Loan) {
    return reverseTransaction(transaction, activeUser, loan);
  },
};