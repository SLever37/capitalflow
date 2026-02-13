
// services/ledger/ledgerService.ts
import { Loan, UserProfile, CapitalSource, LedgerEntry } from '../../types';
import { executeLedgerAction } from './ledgerActions';
import { reverseTransaction } from './ledgerReverse';

// Add exported type to fix missing member error in ledger.service.ts
export type LedgerActionType = 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'DELETE_CLIENT' | 'DELETE_SOURCE';

export const ledgerService = {
  executeLedgerAction(params: {
    // Fix: Use LedgerActionType instead of inline union for consistency with ledger.service.ts
    type: LedgerActionType;
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
