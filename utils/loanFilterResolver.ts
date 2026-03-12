
import { Loan, LoanStatus } from '../types';
import { getDaysDiff } from './dateHelpers';

export type LoanVisualClassification = 
  | 'EM_DIA'
  | 'ATRASADO'
  | 'CRITICO'
  | 'QUITADO'
  | 'RENEGOCIADO'
  | 'IGNORAR';

/**
 * Função única para classificar contratos para fins de filtro visual.
 * Centraliza a regra de negócio do CapitalFlow.
 */
export const resolveLoanVisualClassification = (loan: Loan): LoanVisualClassification => {
  // 1. Verificações de Quitação (QUITADO)
  // Se o contrato está marcado explicitamente como quitado ou pago
  const hasPaidStatus = [LoanStatus.QUITADO, LoanStatus.PAGO, LoanStatus.PAID].includes(loan.status);
  
  // Verificação de parcelas (todas pagas)
  const allInstallmentsPaid = loan.installments.length > 0 && 
    loan.installments.every(i => i.status === LoanStatus.PAID);
  
  // Verificação de saldo devedor (tolerância de 0.10)
  const totalRemaining = loan.installments.reduce((acc, i) => 
    acc + (Number(i.principalRemaining) || 0) + (Number(i.interestRemaining) || 0), 0
  );
  const isZeroBalance = totalRemaining < 0.10;

  // Verificação de acordo finalizado
  const isAgreementFinalized = !!loan.activeAgreement && 
    ['PAID', 'PAGO', 'FINALIZADO'].includes(loan.activeAgreement.status);

  if (hasPaidStatus || allInstallmentsPaid || isZeroBalance || isAgreementFinalized) {
    return 'QUITADO';
  }

  // 2. Verificação de Arquivamento (IGNORAR ou QUITADO)
  // Regra: Quitados já representam o arquivo. Se estiver arquivado mas não caiu na regra acima, ignoramos.
  if (loan.isArchived) {
    return 'IGNORAR';
  }

  // 3. Verificação de Renegociação (RENEGOCIADO)
  // Se contrato estiver renegociado ou com acordo ativo
  const hasActiveAgreement = !!loan.activeAgreement && 
    ['ACTIVE', 'ATIVO'].includes(loan.activeAgreement.status);
  
  if (loan.status === LoanStatus.RENEGOCIADO || loan.status === LoanStatus.EM_ACORDO || hasActiveAgreement) {
    return 'RENEGOCIADO';
  }

  // 4. Verificação de Atrasos (CRITICO / ATRASADO)
  const maxDelay = Math.max(0, ...loan.installments.map(i => {
    if (i.status === LoanStatus.PAID) return 0;
    return getDaysDiff(i.dueDate);
  }));

  if (maxDelay >= 30) {
    return 'CRITICO';
  }

  if (maxDelay > 0) {
    return 'ATRASADO';
  }

  // 5. Em Dia (EM_DIA)
  return 'EM_DIA';
};
