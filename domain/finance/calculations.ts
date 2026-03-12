
import { Installment, Loan, LoanStatus, LoanPolicy } from "../../types";
import { getDaysDiff as getDaysDiffHelper } from "../../utils/dateHelpers";
import { financeDispatcher } from "./dispatch";
import { CalculationResult } from "./modalities/types";

const round = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

export const getDaysDiff = (dueDateStr: string): number => getDaysDiffHelper(dueDateStr);

export const add30Days = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  date.setDate(date.getDate() + 30);
  return date.toISOString();
};

// --- FUNÇÕES DE STATUS (CORRIGIDAS) ---

// Define o status lógico interno da parcela
export const getInstallmentStatusLogic = (inst: Installment): LoanStatus => {
  const totalRemaining = round((inst.principalRemaining || 0) + (inst.interestRemaining || 0));
  
  // CORREÇÃO: Considera quitado se o valor restante for muito próximo de zero (positivo ou negativo).
  // Isso cobre casos de pagamento excessivo mínimo ou resíduos de arredondamento.
  if (Math.abs(totalRemaining) <= 0.05) return LoanStatus.PAID;
  
  if (getDaysDiff(inst.dueDate) > 0) return LoanStatus.LATE;
  if (inst.paidTotal > 0) return LoanStatus.PARTIAL;
  return LoanStatus.PENDING;
};

// Define o texto de status que o usuário vê na interface
export const deriveUserFacingStatus = (inst: Installment): string => {
  const totalRemaining = round((inst.principalRemaining || 0) + (inst.interestRemaining || 0));
  
  // CORREÇÃO: Usa a mesma lógica robusta do status interno.
  if (Math.abs(totalRemaining) <= 0.05) return "Quitado";

  const days = getDaysDiff(inst.dueDate);
  if (days === 0) return "Vence Hoje";
  if (days > 0) return `${days} dias vencidos`;
  return "Em dia";
};


// --- FACHADA DE CÁLCULO DE DÍVIDA ---

export const calculateTotalDue = (loan: Loan, inst: Installment): CalculationResult => {
  const policy: LoanPolicy = loan.policiesSnapshot || {
    interestRate: loan.interestRate,
    finePercent: loan.finePercent,
    dailyInterestPercent: loan.dailyInterestPercent
  };
  
  const rawCalc = financeDispatcher.calculate(loan, inst, policy);
  return rawCalc;
};


// --- ALOCAÇÃO DE PAGAMENTO ---

export interface PaymentResult {
  principalPaid: number;
  interestPaid: number;
  lateFeePaid: number;
  avGenerated: number;
}

export const allocatePayment = (params: { 
  installment: Installment, 
  paymentAmount: number, 
  paymentPriority?: 'INTEREST_FIRST' | 'PRINCIPAL_FIRST' 
}): PaymentResult => {
  const { installment, paymentAmount } = params;
  let remaining = round(paymentAmount);
  
  const lateFeeDue = Number(installment.lateFeeAccrued) || 0;
  const interestDue = Number(installment.interestRemaining) || 0;
  const principalDue = Number(installment.principalRemaining) || 0;

  const payLateFee = Math.min(remaining, lateFeeDue);
  remaining = round(remaining - payLateFee);
  
  const payInterest = Math.min(remaining, interestDue);
  remaining = round(remaining - payInterest);
  
  const payPrincipal = Math.min(remaining, principalDue);
  remaining = round(remaining - payPrincipal);
  
  const avGenerated = remaining;

  return {
    principalPaid: round(payPrincipal),
    interestPaid: round(payInterest),
    lateFeePaid: round(payLateFee),
    avGenerated: round(avGenerated)
  };
};


// --- RECONSTRUÇÃO DE ESTADO ---

export const rebuildLoanStateFromLedger = (loan: Loan): Loan => {
  if (loan.isArchived && (!loan.ledger || loan.ledger.length === 0)) return loan;

  const rebuiltInstallments = loan.installments.map(inst => ({
    ...inst,
    principalRemaining: round(Number(inst.scheduledPrincipal) || 0), 
    interestRemaining: round(Number(inst.scheduledInterest) || 0),
    lateFeeAccrued: 0, avApplied: 0, paidPrincipal: 0, paidInterest: 0, 
    paidLateFee: 0, paidTotal: 0, status: LoanStatus.PENDING, logs: [] as string[],
    renewalCount: 0, paidDate: undefined as string | undefined
  }));

  const sortedLedger = [...(loan.ledger || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedLedger.forEach(entry => {
    const entryInstId = entry.installmentId ? String(entry.installmentId).trim() : null;
    if (entryInstId) {
      const inst = rebuiltInstallments.find(i => String(i.id).trim() === entryInstId);
      if (inst) {
        inst.paidPrincipal = round(inst.paidPrincipal + (Number(entry.principalDelta) || 0));
        inst.paidInterest = round(inst.paidInterest + (Number(entry.interestDelta) || 0));
        inst.paidLateFee = round(inst.paidLateFee + (Number(entry.lateFeeDelta) || 0));
        inst.paidTotal = round(inst.paidTotal + (Number(entry.amount) || 0));
        
        const pDelta = Number(entry.principalDelta) || 0;
        const iDelta = Number(entry.interestDelta) || 0;

        inst.principalRemaining = Math.max(0, round(inst.principalRemaining - pDelta));
        inst.interestRemaining = round(inst.interestRemaining - iDelta);
        
        if (['PAYMENT_PARTIAL', 'PAYMENT_INTEREST_ONLY', 'PAYMENT_FULL'].includes(entry.type || '')) {
            if (iDelta > 0 && pDelta === 0) {
                 inst.renewalCount = (inst.renewalCount || 0) + 1;
            }
        }
        if (entry.notes) inst.logs?.push(entry.notes);
      }
    }
  });

  rebuiltInstallments.forEach(inst => {
    // A lógica de status agora é chamada aqui, após o ledger ser processado
    inst.status = getInstallmentStatusLogic(inst);
    if (inst.status === LoanStatus.PAID && !inst.paidDate) {
       const instId = String(inst.id).trim();
       const lastPayment = sortedLedger.filter(e => String(e.installmentId).trim() === instId).pop();
       if (lastPayment) inst.paidDate = lastPayment.date;
    }
  });

  return { ...loan, installments: rebuiltInstallments };
};


// --- ATUALIZAÇÃO EM LOTE ---

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
