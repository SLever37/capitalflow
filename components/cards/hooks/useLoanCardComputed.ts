
import { useMemo } from 'react';
import { Loan, CapitalSource, LoanStatus } from '../../../types';
import { getDaysDiff, parseDateOnlyUTC, addDaysUTC } from '../../../utils/dateHelpers';
import { getInstallmentStatusLogic } from '../../../domain/finance/calculations';
import { modalityRegistry } from '../../../domain/finance/modalities/registry';

export const useLoanCardComputed = (loan: Loan, sources: CapitalSource[], isStealthMode: boolean = false) => {
  const strategy = useMemo(() => modalityRegistry.get(loan.billingCycle), [loan.billingCycle]);
  const showProgress = strategy.card.showProgress;

  const isPaid = useMemo(() => loan.installments.every(i => i.status === LoanStatus.PAID), [loan.installments]);
  const isLate = useMemo(() => loan.installments.some(i => getInstallmentStatusLogic(i) === LoanStatus.LATE), [loan.installments]);
  
  const isCritical = useMemo(() => 
    loan.installments.some(i => getDaysDiff(i.dueDate) > 30 && i.status !== LoanStatus.PAID), 
  [loan.installments]);
  
  const hasNotes = useMemo(() => loan.notes && loan.notes.trim().length > 0, [loan.notes]);

  const isDailyFree = loan.billingCycle === 'DAILY_FREE';
  const isFixedTerm = loan.billingCycle === 'DAILY_FIXED_TERM';

  const totalDebt = useMemo(() => 
    loan.installments.reduce((acc, i) => acc + i.principalRemaining + i.interestRemaining, 0), 
  [loan.installments]);
  
  const isZeroBalance = totalDebt < 0.10;

  const agreement = loan.activeAgreement;
  const normalizedAgreementStatus = (agreement?.status === 'ACTIVE') ? 'ACTIVE' : agreement?.status;
  const hasActiveAgreement = !!agreement && normalizedAgreementStatus === 'ACTIVE';
  const isAgreementPaid = !!agreement && agreement.status === 'PAID';

  const fixedTermStats = useMemo(() => {
      if (!isFixedTerm) return null;
      const start = parseDateOnlyUTC(loan.startDate);
      const end = parseDateOnlyUTC(loan.installments[0].dueDate);
      const msPerDay = 1000 * 60 * 60 * 24;
      const totalDays = Math.round((end.getTime() - start.getTime()) / msPerDay);
      const dailyValue = (loan.totalToReceive || 0) / (totalDays || 1);
      const currentDebt = (loan.installments[0].principalRemaining || 0) + (loan.installments[0].interestRemaining || 0);
      const amountPaid = Math.max(0, (loan.totalToReceive || 0) - currentDebt);
      const paidDays = dailyValue > 0 ? Math.floor((amountPaid + 0.1) / dailyValue) : 0;
      const paidUntilDate = addDaysUTC(start, paidDays);
      const progressPercent = Math.min(100, Math.max(0, (paidDays / totalDays) * 100));
      return { totalDays, paidDays, dailyValue, progressPercent, paidUntilDate };
  }, [isFixedTerm, loan]);

  const isFullyFinalized = isPaid || isZeroBalance || (isFixedTerm && fixedTermStats && fixedTermStats.paidDays >= fixedTermStats.totalDays) || isAgreementPaid;

  // Estilos
  let cardStyle = "bg-slate-900 border-slate-800";
  let iconStyle = "bg-slate-800 text-slate-500";

  if (hasActiveAgreement) {
      cardStyle = "bg-indigo-950/20 border-indigo-500/30";
      iconStyle = "bg-indigo-500/20 text-indigo-400";
  } else if (hasNotes) { 
      cardStyle = "bg-amber-950/20 border-amber-500/30"; 
  }
  
  if (isFullyFinalized) {
    cardStyle = "bg-emerald-950/40 border-emerald-500/60 shadow-emerald-900/20";
    iconStyle = "bg-emerald-500 text-emerald-950";
  }
  else if (isLate && !hasActiveAgreement) {
    cardStyle = "bg-rose-950/30 border-rose-500/50 shadow-rose-900/10";
    iconStyle = "bg-rose-500/20 text-rose-500";
  }
  else if (!isLate && !hasActiveAgreement) {
    const daysUntilDue = Math.min(...loan.installments.filter(i => i.status !== LoanStatus.PAID).map(i => {
        // FIX: Se for Mensal e datas iguais (recém renovado), força 30 dias para evitar card Laranja
        if (!loan.billingCycle.includes('DAILY') && loan.startDate && i.dueDate) {
             const d1 = parseDateOnlyUTC(loan.startDate).getTime();
             const d2 = parseDateOnlyUTC(i.dueDate).getTime();
             if (d1 === d2) return 30;
        }
        return -getDaysDiff(i.dueDate);
    }));

    if (daysUntilDue >= 0 && daysUntilDue <= 3) {
      cardStyle = "bg-orange-950/30 border-orange-500/50 shadow-orange-900/10";
      iconStyle = "bg-orange-500/20 text-orange-500";
    }
    else if (!hasNotes) {
      cardStyle = "bg-blue-950/20 border-blue-500/30 shadow-blue-900/5";
      iconStyle = "bg-blue-600/20 text-blue-500";
    }
  }

  const allLedger = useMemo(() => {
    if (!loan.ledger || !Array.isArray(loan.ledger)) return [];
    return [...loan.ledger].sort((a, b) => {
      const tA = new Date(a.date).getTime();
      const tB = new Date(b.date).getTime();
      return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
    });
  }, [loan.ledger]);

  const orderedInstallments = useMemo(() => {
    let all = [...loan.installments].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    if (showProgress) {
      if (!isPaid) {
        all = all.filter(i => i.status !== LoanStatus.PAID && Math.round(i.principalRemaining) > 0);
      }
    }
    return all;
  }, [loan.installments, showProgress, isPaid]);

  return {
    strategy,
    showProgress,
    isPaid,
    isLate,
    isCritical,
    hasNotes,
    isDailyFree,
    isFixedTerm,
    totalDebt,
    isZeroBalance,
    hasActiveAgreement,
    isAgreementPaid,
    isFullyFinalized,
    fixedTermStats,
    cardStyle,
    iconStyle,
    allLedger,
    orderedInstallments
  };
};
