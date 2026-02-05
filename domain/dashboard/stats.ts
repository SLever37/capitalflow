
import { Loan, LoanStatus, UserProfile } from '../../types';
import { getInstallmentStatusLogic } from '../../domain/finance/calculations';

export const buildDashboardStats = (loans: Loan[], activeUser: UserProfile | null) => {
  const activeLoans = loans.filter(l => !l.isArchived);
  
  // 1. CAPITAL NA RUA & CONTAGEM
  // Soma apenas do Principal Restante (O que saiu do caixa e ainda não voltou)
  const totalLent = activeLoans.reduce((acc, l) => {
      const loanPrincipalRemaining = l.installments.reduce((sum, i) => sum + (Number(i.principalRemaining) || 0), 0);
      if (loanPrincipalRemaining < 0.10) return acc;
      return acc + loanPrincipalRemaining;
  }, 0);

  const activeCount = activeLoans.filter(l => {
      const debt = l.installments.reduce((sum, i) => sum + (Number(i.principalRemaining) || 0), 0);
      return debt > 0.10;
  }).length;

  // 2. TOTAIS GERAIS
  const totalReceived = loans.reduce((acc, l) => acc + l.installments.reduce((sum, i) => sum + (Number(i.paidTotal) || 0), 0), 0);
  
  // 3. LUCRO PROJETADO (EXPECTATIVA)
  const expectedProfit = activeLoans.reduce((acc, l) => {
      const loanInterest = l.installments.reduce((sum, i) => sum + (Number(i.interestRemaining) || 0), 0);
      const loanLateFee = l.installments.reduce((sum, i) => sum + (Number(i.lateFeeAccrued) || 0), 0);
      return acc + loanInterest + loanLateFee;
  }, 0);

  // ROI Estimado (Lucro Projetado / Capital na Rua)
  const roi = totalLent > 0 ? (expectedProfit / totalLent) * 100 : 0;

  const interestBalance = Number(activeUser?.interestBalance) || 0;
  
  const paidCount = loans.filter(l => l.installments.every(i => i.status === LoanStatus.PAID)).length; 
  const lateCount = activeLoans.filter(l => l.installments.some(i => getInstallmentStatusLogic(i) === LoanStatus.LATE) && !l.installments.every(i => i.status === LoanStatus.PAID)).length;
  const onTimeCount = activeLoans.length - lateCount; 
  
  const pieData = [{ name: 'Em Dia', value: onTimeCount, color: '#3b82f6' }, { name: 'Atrasados', value: lateCount, color: '#f43f5e' }, { name: 'Quitados', value: paidCount, color: '#10b981' }];
  
  const monthlyDataMap: {[key: string]: {name: string, Entradas: number, Saidas: number}} = {};
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  let receivedThisMonth = 0;

  const monthsBack = 5;
  for (let i = monthsBack; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7); 
      monthlyDataMap[key] = { name: `${d.getDate()}/${d.getMonth()+1}`, Entradas: 0, Saidas: 0 };
  }
  
  loans.forEach(l => l.ledger.forEach(t => {
      if (!t.date || t.date.length < 7) return;
      const key = t.date.slice(0, 7); 
      
      if (key === currentMonthKey && t.type.includes('PAYMENT')) {
          receivedThisMonth += t.amount;
      }

      if (monthlyDataMap[key]) {
          if (t.type === 'LEND_MORE') monthlyDataMap[key].Saidas += t.amount;
          else if (t.type.includes('PAYMENT')) monthlyDataMap[key].Entradas += t.amount;
      }
  }));
  
  const lineChartData = Object.values(monthlyDataMap).sort((a,b) => a.name.localeCompare(b.name));
  
  return { 
      totalLent, 
      activeCount,
      totalReceived, 
      receivedThisMonth,
      expectedProfit, 
      roi,
      interestBalance, 
      pieData, 
      lineChartData 
  };
};
