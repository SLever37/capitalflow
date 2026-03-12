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
    const isExplicitlyActive = loan.status === 'ATIVO' || loan.status === 'EM_ACORDO';
    
    if (n(bal.totalRemaining) <= 0.05 && !isExplicitlyActive) return 'PAID';

    const today = new Date();
    const overdue = getInstallments(loan).some((inst) => {
      // Se a parcela já tem saldo zerado, ela NÃO pode ser considerada vencida/aberta
      const principalOpen = n(inst?.principal_remaining ?? inst?.principalRemaining);
      const interestOpen = n(inst?.interest_remaining ?? inst?.interestRemaining);
      if (principalOpen + interestOpen <= 0.05) return false;

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
    const agreement = loan.activeAgreement;
    const isAgreementActive = agreement && (agreement.status === 'ACTIVE' || agreement.status === 'ATIVO');
    
    // Se houver acordo ativo, usamos as parcelas do acordo para o saldo
    if (isAgreementActive && agreement.installments && agreement.installments.length > 0) {
      let total = 0;
      let paid = 0;
      for (const inst of agreement.installments) {
        const amt = n(inst.amount);
        const pAmt = n(inst.paidAmount);
        total += amt;
        paid += pAmt;
      }
      const remaining = Math.max(0, total - paid);
      return {
        principalRemaining: remaining,
        interestRemaining: 0,
        lateFeeRemaining: 0,
        totalRemaining: remaining,
      };
    }

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
  // Se não tem saldo devedor, não é acionável
  if (n(bal.totalRemaining) <= 0.05) return false;

  const today = new Date();

  for (const inst of getInstallments(loan)) {
    // Se a parcela já tem saldo zerado, ela NÃO pode ser considerada para ação jurídica
    const principalOpen = n(inst?.principal_remaining ?? inst?.principalRemaining);
    const interestOpen = n(inst?.interest_remaining ?? inst?.interestRemaining);
    if (principalOpen + interestOpen <= 0.05) continue;

    const status = String(inst?.status || '').toUpperCase();
    if (status === 'PAID') continue;

    const due = getDueDate(inst);
    if (!due) continue;

    const overdueDays = (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24);

    // Regra: Mais de 5 dias de atraso já considera "acionável" para notificação,
    // mas a regra jurídica estrita pode ser 30 dias. 
    // O usuário reclamou de "notificação falsa de cliente que não venceu".
    // Então só deve retornar true se JÁ VENCEU.
    if (overdueDays > 0) return true;
  }

  return false;
}

// 🔥 EXPORT DUPLO (garante compatibilidade)
export const loanEngine = engine;
export default engine;
