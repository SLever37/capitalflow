// domain/loanEngine.ts

import { Loan, LoanStatus } from "../types";
import { getInstallmentStatusLogic } from "./finance/calculations";

export interface LoanBalance {
  principalRemaining: number;
  interestRemaining: number;
  lateFeeRemaining: number;
  totalRemaining: number;
  isPaid: boolean;
  isCyclePaid: boolean;
  daysInCycle: number;
}

export const loanEngine = {

  /* =====================================================
     SALDO TOTAL DO CONTRATO
  ===================================================== */
  computeRemainingBalance: (loan: Loan): LoanBalance => {

    const installments = loan.installments || [];
    const today = new Date();

    const principal = installments.reduce(
      (acc, i) => acc + (Number(i.principalRemaining) || 0),
      0
    );

    const interest = installments.reduce(
      (acc, i) => acc + (Number(i.interestRemaining) || 0),
      0
    );

    const lateFee = installments.reduce(
      (acc, i) => acc + (Number(i.lateFeeAccrued) || 0),
      0
    );

    const total = principal + interest + lateFee;

    const activeInstallment = installments
      .filter(i => i.status !== LoanStatus.PAID)
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() -
          new Date(b.dueDate).getTime()
      )[0];

    let daysInCycle = 0;
    let isCyclePaid = false;

    if (activeInstallment) {
      const dueDate = new Date(activeInstallment.dueDate);
      const diffTime = today.getTime() - dueDate.getTime();

      daysInCycle = Math.floor(
        diffTime / (1000 * 60 * 60 * 24)
      );

      isCyclePaid =
        (Number(activeInstallment.interestRemaining) || 0) <= 0 &&
        (Number(activeInstallment.lateFeeAccrued) || 0) <= 0;
    }

    return {
      principalRemaining: Math.max(0, principal),
      interestRemaining: Math.max(0, interest),
      lateFeeRemaining: Math.max(0, lateFee),
      totalRemaining: Math.max(0, total),
      isPaid: total <= 0.05,
      isCyclePaid,
      daysInCycle,
    };
  },

  /* =====================================================
     STATUS COMPUTADO DO CONTRATO
  ===================================================== */
  computeLoanStatus: (
    loan: Loan
  ): "ACTIVE" | "OVERDUE" | "PAID" | "LEGAL" => {

    const balance = loanEngine.computeRemainingBalance(loan);

    if (balance.isPaid) return "PAID";

    // Se existir acordo ativo → entra como LEGAL
    if (
      loan.activeAgreement &&
      loan.activeAgreement.status === "ACTIVE"
    ) {
      return "LEGAL";
    }

    const hasLate = (loan.installments || []).some(
      i => getInstallmentStatusLogic(i) === LoanStatus.LATE
    );

    if (hasLate) return "OVERDUE";

    return "ACTIVE";
  },

  /* =====================================================
     REGRA DE AMORTIZAÇÃO
     (ordem: multa → juros → principal)
  ===================================================== */
  calculateAmortization: (amount: number, loan: Loan) => {

    let remaining = amount;

    const result = {
      paidLateFee: 0,
      paidInterest: 0,
      paidPrincipal: 0,
      profit: 0,
      capital: 0,
    };

    const balance = loanEngine.computeRemainingBalance(loan);

    result.paidLateFee = Math.min(
      remaining,
      balance.lateFeeRemaining
    );
    remaining -= result.paidLateFee;

    result.paidInterest = Math.min(
      remaining,
      balance.interestRemaining
    );
    remaining -= result.paidInterest;

    result.paidPrincipal = Math.min(
      remaining,
      balance.principalRemaining
    );
    remaining -= result.paidPrincipal;

    result.profit =
      result.paidLateFee + result.paidInterest;

    result.capital = result.paidPrincipal;

    return result;
  },

  /* =====================================================
     ELEGIBILIDADE PARA COBRANÇA JURÍDICA
  ===================================================== */
  isLegallyActionable: (loan: Loan): boolean => {

    const status = loanEngine.computeLoanStatus(loan);
    const balance = loanEngine.computeRemainingBalance(loan);

    const isEligibleStatus =
      status === "OVERDUE" || status === "LEGAL";

    const hasDebt =
      balance.totalRemaining > 0.05;

    return isEligibleStatus && hasDebt;
  },

};