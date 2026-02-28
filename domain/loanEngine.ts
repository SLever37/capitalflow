
import { Loan, Installment, LoanStatus, Agreement } from "../types";
import { getInstallmentStatusLogic } from "./finance/calculations";

export interface LoanBalance {
  principalRemaining: number;
  interestRemaining: number;
  lateFeeRemaining: number;
  totalRemaining: number;
  isPaid: boolean;
  isCyclePaid: boolean; // Se o juros/multa do ciclo atual foi pago
  daysInCycle: number;
}

/**
 * ENGINE CENTRAL DE DOMÍNIO - FONTE ÚNICA DE VERDADE
 * Implementação de Amortização Seletiva e Ciclos de 30 Dias
 */
export const loanEngine = {
  /**
   * 1. Calcula o saldo remanescente real e status do ciclo
   */
  computeRemainingBalance: (loan: Loan): LoanBalance => {
    const installments = loan.installments || [];
    const today = new Date();
    
    const principal = installments.reduce((acc, i) => acc + (Number(i.principalRemaining) || 0), 0);
    const interest = installments.reduce((acc, i) => acc + (Number(i.interestRemaining) || 0), 0);
    const lateFee = installments.reduce((acc, i) => acc + (Number(i.lateFeeAccrued) || 0), 0);
    
    const total = principal + interest + lateFee;

    // Lógica de Ciclo: Verifica a parcela mais antiga não paga
    const activeInstallment = installments
      .filter(i => i.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    let daysInCycle = 0;
    let isCyclePaid = false;

    if (activeInstallment) {
      const dueDate = new Date(activeInstallment.dueDate);
      const diffTime = today.getTime() - dueDate.getTime();
      daysInCycle = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Se o juros e multa da parcela atual foram zerados, o ciclo está "pago"
      isCyclePaid = (Number(activeInstallment.interestRemaining) || 0) <= 0 && 
                    (Number(activeInstallment.lateFeeAccrued) || 0) <= 0;
    }
    
    return {
      principalRemaining: Math.max(0, principal),
      interestRemaining: Math.max(0, interest),
      lateFeeRemaining: Math.max(0, lateFee),
      totalRemaining: Math.max(0, total),
      isPaid: total <= 0.05,
      isCyclePaid,
      daysInCycle
    };
  },

  /**
   * 2. Computa o status lógico do contrato
   */
  computeLoanStatus: (loan: Loan): 'ACTIVE' | 'OVERDUE' | 'PAID' | 'ENCERRADO' | 'LEGAL' => {
    if (loan.status === 'ENCERRADO') return 'ENCERRADO';
    
    const balance = loanEngine.computeRemainingBalance(loan);
    if (balance.isPaid) return 'PAID';

    if (loan.activeAgreement && loan.activeAgreement.status === 'ACTIVE') {
      return 'LEGAL';
    }

    const hasLate = (loan.installments || []).some(i => getInstallmentStatusLogic(i) === LoanStatus.LATE);
    if (hasLate) return 'OVERDUE';

    return 'ACTIVE';
  },

  /**
   * 3. Lógica de Amortização Seletiva (Simulação de Baixa)
   * Prioridade: Multa -> Mora -> Juros -> Principal
   */
  calculateAmortization: (amount: number, loan: Loan) => {
    let remaining = amount;
    const result = {
      paidLateFee: 0,
      paidInterest: 0,
      paidPrincipal: 0,
      profit: 0, // Juros + Multa (Vai para Caixa Livre)
      capital: 0 // Principal (Volta para Carteira)
    };

    const balance = loanEngine.computeRemainingBalance(loan);

    // 1. Paga Multa/Mora
    result.paidLateFee = Math.min(remaining, balance.lateFeeRemaining);
    remaining -= result.paidLateFee;

    // 2. Paga Juros
    result.paidInterest = Math.min(remaining, balance.interestRemaining);
    remaining -= result.paidInterest;

    // 3. Paga Principal
    result.paidPrincipal = Math.min(remaining, balance.principalRemaining);
    remaining -= result.paidPrincipal;

    result.profit = result.paidLateFee + result.paidInterest;
    result.capital = result.paidPrincipal;

    return result;
  },

  /**
   * 4. Define se o contrato deve aparecer no módulo Jurídico
   */
  isLegallyActionable: (loan: Loan): boolean => {
    const status = loanEngine.computeLoanStatus(loan);
    const balance = loanEngine.computeRemainingBalance(loan);
    const isEligibleStatus = status === 'OVERDUE' || status === 'LEGAL';
    const hasDebt = balance.totalRemaining > 0.05;
    return isEligibleStatus && hasDebt;
  }
};
