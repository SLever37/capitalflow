// domain/loanEngine.ts
import { Loan } from '../types';

/**
 * HARDENING (HMR/imports):
 * Alguns ambientes (Vite/HMR + importações inconsistentes) podem deixar este módulo
 * em estado “parcial” durante hot-reload, gerando erros do tipo:
 *   "loanEngine.isLegallyActionable is not a function"
 *
 * Para blindar:
 * 1) Mantemos export named (`loanEngine`) e default.
 * 2) Exportamos `isLegallyActionable` também como função isolada.
 */

type RemainingBalance = {
  totalRemaining: number;
  principalRemaining: number;
  interestRemaining: number;
  lateFeeRemaining: number;
};

type Amortization = {
  paidPrincipal: number;
  paidInterest: number;
  paidLateFee: number;
};

const n = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

const getInstallments = (loan: any): any[] =>
  Array.isArray(loan?.installments) ? loan.installments : [];

const getDueDate = (inst: any): Date | null => {
  const raw = inst?.due_date ?? inst?.dueDate ?? inst?.data_vencimento;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const engine = {
  /**
   * Status do contrato para UI:
   * - PAID: saldo total ~ 0
   * - OVERDUE: existe parcela vencida não paga
   * - ACTIVE: caso contrário
   */
  computeLoanStatus(loan: Loan): 'PAID' | 'ACTIVE' | 'OVERDUE' {
    const bal = engine.computeRemainingBalance(loan);
    if (n(bal.totalRemaining) <= 0.05) return 'PAID';

    const today = new Date();
    const overdue = getInstallments(loan).some((inst) => {
      const status = String(inst?.status || '').toUpperCase();
      if (status === 'PAID') return false;
      const due = getDueDate(inst);
      if (!due) return false;
      return due.getTime() < today.getTime();
    });

    return overdue ? 'OVERDUE' : 'ACTIVE';
  },

  /**
   * Soma tudo o que ainda falta receber no contrato.
   */
  computeRemainingBalance(loan: Loan): RemainingBalance {
    const installments = getInstallments(loan);

    if (!installments.length) {
      return {
        totalRemaining: 0,
        principalRemaining: 0,
        interestRemaining: 0,
        lateFeeRemaining: 0,
      };
    }

    let principal = 0;
    let interest = 0;
    let late = 0;

    for (const inst of installments) {
      principal += Math.max(0, n(inst?.principal_remaining ?? inst?.principalRemaining));
      interest += Math.max(0, n(inst?.interest_remaining ?? inst?.interestRemaining));
      late += Math.max(0, n(inst?.late_fee_accrued ?? inst?.lateFeeAccrued));
    }

    return {
      principalRemaining: principal,
      interestRemaining: interest,
      lateFeeRemaining: late,
      totalRemaining: principal + interest + late,
    };
  },

  /**
   * Amortização seletiva (mantém sua regra atual):
   * juros -> multa -> principal
   */
  calculateAmortization(amount: number, loan: Loan): Amortization {
    const balance = engine.computeRemainingBalance(loan);

    let remaining = n(amount);
    if (remaining <= 0) {
      return { paidPrincipal: 0, paidInterest: 0, paidLateFee: 0 };
    }

    const paidInterest = Math.min(remaining, balance.interestRemaining);
    remaining -= paidInterest;

    const paidLateFee = Math.min(remaining, balance.lateFeeRemaining);
    remaining -= paidLateFee;

    const paidPrincipal = Math.min(remaining, balance.principalRemaining);

    return { paidPrincipal, paidInterest, paidLateFee };
  },

  /**
   * Renovação: paga apenas juros + multa
   */
  calculateRenewal(loan: Loan): Amortization {
    const balance = engine.computeRemainingBalance(loan);
    return {
      paidPrincipal: 0,
      paidInterest: balance.interestRemaining,
      paidLateFee: balance.lateFeeRemaining,
    };
  },

  // Compat: mantém no objeto
  isLegallyActionable(loan: Loan): boolean {
    return isLegallyActionable(loan);
  },
};

/**
 * Regra de acionamento jurídico (isolada):
 * - true se ainda existe saldo > 0
 * - OU se existe parcela vencida há mais de 30 dias com principal em aberto
 */
export function isLegallyActionable(loan: Loan): boolean {
  if (!loan) return false;

  const bal = engine.computeRemainingBalance(loan);
  if (n(bal.totalRemaining) > 0.05) return true;

  const today = new Date();

  for (const inst of getInstallments(loan)) {
    const status = String(inst?.status || '').toUpperCase();
    if (status === 'PAID') continue;

    const due = getDueDate(inst);
    if (!due) continue;

    const overdueDays = (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24);
    const principalOpen = n(inst?.principal_remaining ?? inst?.principalRemaining);

    if (overdueDays > 30 && principalOpen > 0) return true;
  }

  return false;
}

// 🔥 EXPORT DUPLO (garante compatibilidade)
export const loanEngine = engine;
export default engine;
