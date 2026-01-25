
import { Installment, Loan, LoanStatus, LoanPolicy } from "../../types";
import { getDaysDiff as getDaysDiffHelper } from "../../utils/dateHelpers";
import { financeDispatcher } from "./dispatch";
import { CalculationResult } from "./modalities/types";

// --- UTILITÁRIOS ---
const round = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

export const getDaysDiff = (dueDateStr: string): number => getDaysDiffHelper(dueDateStr);

export const add30Days = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0); 
  date.setDate(date.getDate() + 30);
  return date.toISOString();
};

export const deriveUserFacingStatus = (inst: Installment): string => {
  if (inst.status === LoanStatus.PAID) return "Quitado";
  const days = getDaysDiff(inst.dueDate);
  if (days === 0) return "Vence Hoje";
  if (days > 0) return `${days} dias vencidos`;
  return "Em dia";
};

export const getInstallmentStatusLogic = (inst: Installment): LoanStatus => {
  if (round(inst.principalRemaining) <= 0) return LoanStatus.PAID;
  if (getDaysDiff(inst.dueDate) > 0) return LoanStatus.LATE;
  if (inst.paidTotal > 0) return LoanStatus.PARTIAL;
  return LoanStatus.PENDING;
};

// FACHADA PRINCIPAL
export const calculateTotalDue = (loan: Loan, inst: Installment): CalculationResult => {
  const policy: LoanPolicy = loan.policiesSnapshot || {
    interestRate: loan.interestRate,
    finePercent: loan.finePercent,
    dailyInterestPercent: loan.dailyInterestPercent
  };
  return financeDispatcher.calculate(loan, inst, policy);
};

export interface PaymentResult {
  principalPaid: number;
  interestPaid: number;
  lateFeePaid: number;
  avGenerated: number;
}

export const allocatePayment = (paymentAmount: number, debt: CalculationResult): PaymentResult => {
  let remaining = round(paymentAmount);
  const payLateFee = Math.min(remaining, debt.lateFee);
  remaining = round(remaining - payLateFee);
  const payInterest = Math.min(remaining, debt.interest);
  remaining = round(remaining - payInterest);
  const payPrincipal = Math.min(remaining, debt.principal);
  remaining = round(remaining - payPrincipal);
  const avGenerated = remaining;

  return {
    principalPaid: round(payPrincipal),
    interestPaid: round(payInterest),
    lateFeePaid: round(payLateFee),
    avGenerated: round(avGenerated)
  };
};

// Reconstrução de Estado e Atualização em Lote
export const rebuildLoanStateFromLedger = (loan: Loan): Loan => {
  if (loan.isArchived && (!loan.ledger || loan.ledger.length === 0)) return loan;

  const rebuiltInstallments = loan.installments.map(inst => ({
    ...inst,
    principalRemaining: round(inst.scheduledPrincipal),
    interestRemaining: round(inst.scheduledInterest),
    lateFeeAccrued: 0,
    avApplied: 0,
    paidPrincipal: 0,
    paidInterest: 0,
    paidLateFee: 0,
    paidTotal: 0,
    status: LoanStatus.PENDING,
    logs: [] as string[],
    renewalCount: 0 
  }));

  const sortedLedger = [...(loan.ledger || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // CORREÇÃO: Removido filtro de data baseado em startDate para evitar que pagamentos antigos registrados sumam do cálculo se a data do contrato for alterada.

  sortedLedger.forEach(entry => {
    if (entry.installmentId) {
      const inst = rebuiltInstallments.find(i => i.id === entry.installmentId);
      if (inst) {
        inst.paidPrincipal = round(inst.paidPrincipal + entry.principalDelta);
        inst.paidInterest = round(inst.paidInterest + entry.interestDelta);
        inst.paidLateFee = round(inst.paidLateFee + entry.lateFeeDelta);
        inst.paidTotal = round(inst.paidTotal + entry.amount);
        inst.principalRemaining = round(Math.max(0, inst.principalRemaining - entry.principalDelta));
        inst.interestRemaining = round(Math.max(0, inst.interestRemaining - entry.interestDelta));
        if (['PAYMENT_PARTIAL', 'PAYMENT_INTEREST_ONLY', 'PAYMENT_FULL'].includes(entry.type)) inst.renewalCount = (inst.renewalCount || 0) + 1;
        if (entry.notes) inst.logs?.push(entry.notes);
      }
    }
  });

  rebuiltInstallments.forEach(inst => {
    inst.status = getInstallmentStatusLogic(inst);
    if (inst.status === LoanStatus.PAID && !inst.paidDate) {
       const lastPayment = sortedLedger.filter(e => e.installmentId === inst.id).pop();
       if (lastPayment) inst.paidDate = lastPayment.date;
    }
  });

  return { ...loan, installments: rebuiltInstallments };
};

export const refreshAllLateFees = (loans: Loan[]): Loan[] => {
  return loans.map(loan => {
    const rebuiltLoan = rebuildLoanStateFromLedger(loan);
    const updatedInstallments = rebuiltLoan.installments.map(inst => {
      const debt = calculateTotalDue(rebuiltLoan, inst);
      return { ...inst, lateFeeAccrued: debt.lateFee };
    });
    return { ...rebuiltLoan, installments: updatedInstallments };
  });
};
