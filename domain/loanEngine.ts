import { Loan, LoanStatus } from '../types';
import { getInstallmentStatusLogic } from './finance/calculations';

export const loanEngine = {

  computeRemainingBalance(loan: Loan) {
    if (!loan?.installments?.length) {
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

    for (const inst of loan.installments) {
      principal += Math.max(0, Number(inst.principalRemaining || 0));
      interest += Math.max(0, Number(inst.interestRemaining || 0));
      late += Math.max(0, Number(inst.lateFeeAccrued || 0));
    }

    return {
      principalRemaining: principal,
      interestRemaining: interest,
      lateFeeRemaining: late,
      totalRemaining: principal + interest + late,
    };
  },

  computeLoanStatus(loan: Loan): "ACTIVE" | "OVERDUE" | "PAID" | "LEGAL" {
    const balance = this.computeRemainingBalance(loan);
    if (balance.totalRemaining <= 0.05) return "PAID";

    if (loan.activeAgreement && loan.activeAgreement.status === "ACTIVE") {
      return "LEGAL";
    }

    const hasLate = (loan.installments || []).some(
      i => getInstallmentStatusLogic(i) === LoanStatus.LATE
    );

    if (hasLate) return "OVERDUE";

    return "ACTIVE";
  },

  isLegallyActionable(loan: Loan): boolean {
    const status = this.computeLoanStatus(loan);
    const balance = this.computeRemainingBalance(loan);

    const isEligibleStatus = status === "OVERDUE" || status === "LEGAL";
    const hasDebt = balance.totalRemaining > 0.05;

    return isEligibleStatus && hasDebt;
  },

  calculateAmortization(amount: number, loan: Loan) {
    const balance = this.computeRemainingBalance(loan);
    let remaining = amount;

    const paidInterest = Math.min(remaining, balance.interestRemaining);
    remaining -= paidInterest;

    const paidLateFee = Math.min(remaining, balance.lateFeeRemaining);
    remaining -= paidLateFee;

    const paidPrincipal = Math.min(remaining, balance.principalRemaining);

    return {
      paidPrincipal: Math.max(0, paidPrincipal),
      paidInterest: Math.max(0, paidInterest),
      paidLateFee: Math.max(0, paidLateFee),
    };
  },

  // 🔵 NOVA FUNÇÃO — RENOVAÇÃO PURA
  calculateRenewal(loan: Loan) {
    const balance = this.computeRemainingBalance(loan);

    return {
      paidPrincipal: 0,
      paidInterest: balance.interestRemaining,
      paidLateFee: balance.lateFeeRemaining,
    };
  },
};