
import { Loan, LoanStatus } from '../../types';
import { onlyDigits } from '../../utils/formatters';
import { getInstallmentStatusLogic } from '../../domain/finance/calculations';
import { getDaysDiff, parseDateOnlyUTC } from '../../utils/dateHelpers';

// Função auxiliar para determinar se um contrato está "efetivamente pago"
const isLoanFullyPaid = (l: Loan): boolean => {
    // 1. Verificação Padrão
    const allPaidStatus = l.installments.every(i => i.status === LoanStatus.PAID);
    if (allPaidStatus) return true;

    // 2. Verificação de Prazo Fixo Finalizado (Sem dívida)
    if (l.billingCycle === 'DAILY_FIXED_TERM') {
        const totalDebt = l.installments.reduce((acc, i) => acc + i.principalRemaining + i.interestRemaining, 0);
        
        // Verifica se completou o ciclo de dias
        const start = parseDateOnlyUTC(l.startDate);
        const end = parseDateOnlyUTC(l.installments[0].dueDate);
        const msPerDay = 1000 * 60 * 60 * 24;
        const totalDays = Math.round((end.getTime() - start.getTime()) / msPerDay);
        
        const dailyValue = (l.totalToReceive || 0) / (totalDays || 1);
        const amountPaid = Math.max(0, (l.totalToReceive || 0) - totalDebt);
        const paidDays = dailyValue > 0 ? Math.floor((amountPaid + 0.1) / dailyValue) : 0;

        if (paidDays >= totalDays) return true;
    }

    // 3. Verificação de Resíduo (Tolerância de R$ 0.10)
    // Cobre modalidade MENSAL se o principal for zerado mas status não atualizado
    const totalRemaining = l.installments.reduce((acc, i) => acc + i.principalRemaining + i.interestRemaining, 0);
    if (totalRemaining < 0.10) return true;

    return false;
};

export const filterLoans = (
  loans: Loan[],
  searchTerm: string,
  statusFilter: 'TODOS' | 'ATRASADOS' | 'EM_DIA' | 'PAGOS' | 'ARQUIVADOS' | 'ATRASO_CRITICO'
): Loan[] => {
  let result = loans;
  
  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    result = result.filter(l =>
      l.debtorName.toLowerCase().includes(lower) ||
      String(l.debtorDocument || '').toLowerCase().includes(lower) ||
      String(l.debtorPhone || '').toLowerCase().includes(lower) ||
      String((l as any).debtorEmail || '').toLowerCase().includes(lower) ||
      String((l as any).debtorCode || '').toLowerCase().includes(lower) ||
      String((l as any).debtorClientNumber || '').toLowerCase().includes(lower) ||
      (onlyDigits(lower) && (
        onlyDigits(String(l.debtorDocument || '')).includes(onlyDigits(lower)) ||
        onlyDigits(String(l.debtorPhone || '')).includes(onlyDigits(lower)) ||
        onlyDigits(String((l as any).debtorCode || '')).includes(onlyDigits(lower)) ||
        onlyDigits(String((l as any).debtorClientNumber || '')).includes(onlyDigits(lower))
      ))
    );
  }

  // Lógica Rigorosa de Status
  if (statusFilter === 'TODOS') {
      // Exclui arquivados E exclui quem está efetivamente pago
      result = result.filter(l => !l.isArchived && !isLoanFullyPaid(l));
  } else if (statusFilter === 'ATRASADOS') {
    result = result.filter(l => l.installments.some(i => getInstallmentStatusLogic(i) === LoanStatus.LATE) && !l.isArchived && !isLoanFullyPaid(l));
  } else if (statusFilter === 'ATRASO_CRITICO') {
    result = result.filter(l => l.installments.some(i => getDaysDiff(i.dueDate) > 30 && i.status !== LoanStatus.PAID) && !l.isArchived);
  } else if (statusFilter === 'EM_DIA') {
    result = result.filter(l => l.installments.every(i => getInstallmentStatusLogic(i) !== LoanStatus.LATE) && !isLoanFullyPaid(l) && !l.isArchived);
  } else if (statusFilter === 'PAGOS') {
    // Inclui quem tem status PAID ou quem tem dívida zerada (resíduo) ou Prazo Fixo finalizado
    result = result.filter(l => isLoanFullyPaid(l));
  } else if (statusFilter === 'ARQUIVADOS') {
    result = result.filter(l => l.isArchived);
  }
  
  return result.sort((a, b) => b.startDate.localeCompare(a.startDate));
};
