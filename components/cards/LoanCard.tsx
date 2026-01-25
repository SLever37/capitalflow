
import React, { useState } from 'react';
import {
  Phone, Calendar, ShieldAlert, FileEdit, MessageSquare, RotateCcw,
  Archive, Trash2, History, HandCoins, MoreHorizontal,
  Link as LinkIcon, Upload, CheckCircle2,
  RefreshCcw, Settings, Clock, Calculator, Undo2, Lock, Handshake
} from 'lucide-react';
import { Loan, LoanStatus, Installment, CapitalSource, LedgerEntry, Agreement, AgreementInstallment } from '../../types';
import { getDaysDiff, formatBRDate, parseDateOnlyUTC, todayDateOnlyUTC, addDaysUTC } from '../../utils/dateHelpers';
import { calculateTotalDue, getInstallmentStatusLogic } from '../../domain/finance/calculations';
import { formatMoney } from '../../utils/formatters';
import { modalityRegistry } from '../../domain/finance/modalities/registry';
import { humanizeAuditLog } from '../../utils/auditHelpers';
import { AgreementView } from '../../features/agreements/components/AgreementView';

interface LoanCardProps {
  loan: Loan;
  sources: CapitalSource[];
  isExpanded: boolean;
  onToggleExpand: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onMessage: (e: React.MouseEvent) => void;
  onArchive: (e: React.MouseEvent) => void;
  onRestore: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onNote: (e: React.MouseEvent) => void;
  onPayment: (loan: Loan, inst: Installment, calculations: any) => void;
  onPortalLink: (e: React.MouseEvent) => void;
  onUploadPromissoria: (e: React.MouseEvent) => void;
  onUploadDoc: (e: React.MouseEvent) => void;
  onViewPromissoria: (e: React.MouseEvent, url: string) => void;
  onViewDoc: (e: React.MouseEvent, url: string) => void;
  onReviewSignal: (signalId: string, status: 'APROVADO' | 'NEGADO') => void;
  onOpenComprovante: (url: string) => void;
  onReverseTransaction: (transaction: LedgerEntry, loan: Loan) => void;
  onRenegotiate: (loan: Loan) => void; // Novo
  onAgreementPayment: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void; // Novo
  onRefresh: () => void; // Novo
  isStealthMode?: boolean;
}

export const LoanCard: React.FC<LoanCardProps> = ({
  loan, sources, isExpanded, onToggleExpand, onEdit, onMessage, onArchive,
  onRestore, onDelete, onNote, onPayment, onPortalLink, onUploadPromissoria,
  onUploadDoc, onViewPromissoria, onViewDoc, onReviewSignal, onOpenComprovante, onReverseTransaction,
  onRenegotiate, onAgreementPayment, onRefresh, isStealthMode
}) => {
  // ... (keep existing logic strategies)
  const strategy = modalityRegistry.get(loan.billingCycle);
  const showProgress = strategy.card.showProgress;

  const isPaid = loan.installments.every(i => i.status === LoanStatus.PAID);
  const isLate = loan.installments.some(i => getInstallmentStatusLogic(i) === LoanStatus.LATE);
  const isCritical = loan.installments.some(i => getDaysDiff(i.dueDate) > 30 && i.status !== LoanStatus.PAID);
  const hasNotes = loan.notes && loan.notes.trim().length > 0;

  const isDailyFree = loan.billingCycle === 'DAILY_FREE';
  const isFixedTerm = loan.billingCycle === 'DAILY_FIXED_TERM';

  const totalDebt = loan.installments.reduce((acc, i) => acc + i.principalRemaining + i.interestRemaining, 0);
  const isZeroBalance = totalDebt < 0.10;

  // NEW: Check active agreement
  const hasActiveAgreement = loan.activeAgreement && loan.activeAgreement.status === 'ACTIVE';

  const fixedTermStats = React.useMemo(() => {
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

  // FINALIZADO = PAID status OU Saldo Zero OU Prazo Fixo completo OU Acordo Quitado
  const isAgreementPaid = loan.activeAgreement && loan.activeAgreement.status === 'PAID';
  const isFullyFinalized = isPaid || isZeroBalance || (isFixedTerm && fixedTermStats && fixedTermStats.paidDays >= fixedTermStats.totalDays) || isAgreementPaid;

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
    const daysUntilDue = Math.min(...loan.installments.filter(i => i.status !== LoanStatus.PAID).map(i => -getDaysDiff(i.dueDate)));
    if (daysUntilDue >= 0 && daysUntilDue <= 3) {
      cardStyle = "bg-orange-950/30 border-orange-500/50 shadow-orange-900/10";
      iconStyle = "bg-orange-500/20 text-orange-500";
    }
    else if (!hasNotes) {
      cardStyle = "bg-blue-950/20 border-blue-500/30 shadow-blue-900/5";
      iconStyle = "bg-blue-600/20 text-blue-500";
    }
  }

  const allLedger = React.useMemo(() => {
    if (!loan.ledger || !Array.isArray(loan.ledger)) return [];
    return [...loan.ledger].sort((a, b) => {
      const tA = new Date(a.date).getTime();
      const tB = new Date(b.date).getTime();
      return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
    });
  }, [loan.ledger]);

  const orderedInstallments = React.useMemo(() => {
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

  const renderLedgerItem = (t: LedgerEntry) => {
    const isAudit = t.category === 'AUDIT' || t.notes?.startsWith('{');
    const auditLines = isAudit ? humanizeAuditLog(t.notes || '') : null;
    const isReversible = !isAudit && (t.type.includes('PAYMENT') || t.type === 'LEND_MORE');
    const isAgreementPayment = t.type === 'AGREEMENT_PAYMENT';

    return (
      <div key={t.id} className="flex flex-col border-b border-slate-800/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0 group">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${t.type === 'ADJUSTMENT' ? 'bg-indigo-500/10 text-indigo-400' : t.type === 'LEND_MORE' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {t.type === 'ADJUSTMENT' ? <Settings size={12} /> : t.type === 'LEND_MORE' ? <HandCoins size={12} /> : <CheckCircle2 size={12} />}
            </div>
            <div>
              <p className="text-white font-bold">
                  {isAgreementPayment ? 'Pagamento de Acordo' : isAudit ? 'Edição Manual' : (t.notes || (t.type === 'LEND_MORE' ? 'Empréstimo' : 'Pagamento'))}
              </p>
              <p className="text-[9px] text-slate-500">{new Date(t.date).toLocaleDateString()} às {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isAudit && (
                <span className={`font-black ${t.type === 'LEND_MORE' ? 'text-rose-500' : 'text-emerald-500'}`}>
                {t.type === 'LEND_MORE' ? '-' : '+'} {formatMoney(t.amount, isStealthMode)}
                </span>
            )}
            {isReversible && !isAgreementPayment && (
                <button onClick={(e) => { e.stopPropagation(); onReverseTransaction(t, loan); }} className="p-1.5 bg-slate-800 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Estornar (Desfazer) Lançamento">
                    <Undo2 size={12}/>
                </button>
            )}
          </div>
        </div>
        {auditLines && (
          <div className="mt-2 ml-7 pl-2 border-l border-slate-800 space-y-1">
            {auditLines.map((line, idx) => (
              <p key={idx} className="text-[9px] text-slate-400 leading-tight italic">• {line}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`border transition-all duration-300 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 hover:shadow-2xl cursor-pointer overflow-hidden active:scale-[0.99] ${cardStyle} ${isExpanded ? 'ring-1 ring-white/10' : ''} ${isCritical && !hasActiveAgreement ? 'animate-pulse ring-1 ring-rose-500' : ''}`}
      onClick={onToggleExpand}
    >
      {/* HEADER PRINCIPAL ... (Mantém inalterado) */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4 sm:gap-6 w-full">
          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl transition-all flex-shrink-0 ${iconStyle}`}>
            {isCritical && !hasActiveAgreement ? <ShieldAlert size={24} /> : isFullyFinalized ? <CheckCircle2 size={24}/> : loan.debtorName[0]}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-base sm:text-xl text-white truncate flex items-center gap-2">
                {loan.debtorName}
                {isFullyFinalized && <span className="bg-emerald-500 text-emerald-950 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Finalizado</span>}
                {hasActiveAgreement && <span className="bg-indigo-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Em Acordo</span>}
            </h3>

            <div className="flex flex-wrap gap-2 mt-1 sm:mt-2">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Phone size={10} /> {loan.debtorPhone}
              </p>
              {/* Labels de vencimento normais só aparecem se NÃO tiver acordo ativo */}
              {!hasActiveAgreement && (() => {
                const nextInst = loan.installments.find(i => i.status !== LoanStatus.PAID) || loan.installments[loan.installments.length - 1];
                if (!nextInst) return null;
                const label = strategy.card.dueDateLabel(nextInst, loan); 
                const paidUntilDate = isDailyFree ? loan.startDate : nextInst.dueDate;
                return (
                  <p className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1 bg-emerald-950/50 px-2 rounded border border-emerald-500/20 animate-in fade-in">
                    <Calendar size={10} /> {label} {!isFixedTerm && formatBRDate(paidUntilDate)}
                  </p>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="flex w-full sm:w-auto items-center justify-end gap-2 sm:gap-3 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
          <button onClick={onNote} className={`p-2 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all flex-1 sm:flex-none flex justify-center ${hasNotes ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>
            <FileEdit className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={onMessage} className="p-2 sm:p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl sm:rounded-2xl hover:bg-emerald-500 hover:text-white transition-all flex-1 sm:flex-none flex justify-center">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="flex gap-2">
            {loan.isArchived ? (
              <button onClick={onRestore} className="p-2 sm:p-2.5 rounded-xl bg-slate-800 text-slate-500 hover:text-emerald-500 transition-all">
                <RotateCcw className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={onArchive} className="p-2 sm:p-2.5 rounded-xl bg-slate-800 text-slate-500 hover:text-amber-500 transition-all">
                <Archive className="w-4 h-4" />
              </button>
            )}
            <button onClick={onDelete} className="p-2 sm:p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SUMMARY BAR */}
      <div className="grid grid-cols-3 gap-2 sm:gap-8 pt-6 sm:pt-8 border-t border-white/5 mt-6 sm:mt-8">
        <div className="space-y-1">
          <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Principal</p>
          <p className="font-black text-xs sm:text-base text-white">{formatMoney(loan.principal, isStealthMode)}</p>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Fonte</p>
          <p className="font-black text-[10px] sm:text-xs text-blue-400 truncate max-w-[80px] sm:max-w-none mx-auto">
            {sources.find(s => s.id === loan.sourceId)?.name || '...'}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Taxa Fixa</p>
          <p className="font-black text-xs sm:text-base text-emerald-500">{loan.interestRate}%</p>
        </div>
      </div>

      {/* EXPANDED CONTENT */}
      {isExpanded && (
        <div className="mt-8 sm:mt-10 space-y-6 sm:space-y-8 animate-in slide-in-from-top-4 duration-500" onClick={e => e.stopPropagation()}>
          
          <div className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <History size={14} className="text-blue-500" /> Histórico & Auditoria
              </h4>
            </div>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {allLedger.length > 0 ? (allLedger.map(t => renderLedgerItem(t))) : (<p className="text-[10px] text-slate-600 text-center italic py-4">Nenhuma transação registrada.</p>)}
            </div>
          </div>

          {/* VIEW: ACORDO ATIVO ou LISTA NORMAL */}
          {hasActiveAgreement && loan.activeAgreement ? (
              <AgreementView 
                  agreement={loan.activeAgreement} 
                  loan={loan} 
                  activeUser={null} // Não necessário para view
                  onUpdate={onRefresh}
                  onPayment={(inst) => onAgreementPayment(loan, loan.activeAgreement!, inst)}
              />
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                {orderedInstallments.map((inst, i) => {
                  const st = getInstallmentStatusLogic(inst);
                  const debt = calculateTotalDue(loan, inst);
                  const daysDiff = getDaysDiff(inst.dueDate);
                  const isLateInst = st === LoanStatus.LATE;

                  let statusText = '';
                  let statusColor = '';
                  let isPrepaid = false;
                  let daysPrepaid = 0;

                  if (isDailyFree) {
                    const due = parseDateOnlyUTC(loan.startDate);
                    const now = new Date();
                    due.setHours(0, 0, 0, 0); now.setHours(0, 0, 0, 0);
                    const diffTime = due.getTime() - now.getTime();
                    if (diffTime > 0) { isPrepaid = true; daysPrepaid = Math.floor(diffTime / (1000 * 3600 * 24)); }
                  }

                  const isFixedTermDone = isFixedTerm && fixedTermStats && fixedTermStats.paidDays >= fixedTermStats.totalDays;

                  if (inst.status === LoanStatus.PAID || isZeroBalance) { statusText = 'CONTRATO FINALIZADO'; statusColor = 'text-emerald-500 font-black'; }
                  else if (isPrepaid) { statusText = `Adiantado (${daysPrepaid} dias)`; statusColor = 'text-emerald-400 font-black'; }
                  else if (isFixedTerm) { 
                      const paidUntil = fixedTermStats?.paidUntilDate; const today = todayDateOnlyUTC();
                      if (isFixedTermDone) { statusText = 'CONTRATO FINALIZADO'; statusColor = 'text-emerald-500 font-black'; }
                      else if (paidUntil) {
                          const diffTime = paidUntil.getTime() - today.getTime();
                          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          if (daysLeft >= 0) { statusText = `EM DIA (Pago até ${formatBRDate(paidUntil)})`; statusColor = 'text-emerald-400 font-black'; } 
                          else { statusText = `ATRASADO (${Math.abs(daysLeft)} dias)`; statusColor = 'text-rose-500 font-black animate-pulse'; }
                      } else { statusText = 'EM ABERTO'; statusColor = 'text-blue-400'; }
                  }
                  else if (daysDiff === 0) { statusText = 'Vence HOJE'; statusColor = 'text-amber-400 animate-pulse'; }
                  else if (daysDiff < 0) { statusText = `Faltam ${Math.abs(daysDiff)} dias`; statusColor = 'text-blue-400'; }
                  else { statusText = `Atrasado há ${daysDiff} dias`; statusColor = 'text-rose-500 font-black'; }

                  const realIndex = showProgress ? loan.installments.findIndex(original => original.id === inst.id) + 1 : i + 1;
                  const paidUntilDate = isDailyFree ? loan.startDate : inst.dueDate;
                  const isActionDisabled = inst.status === LoanStatus.PAID || isFullyFinalized;

                  return (
                    <div key={inst.id} className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border flex flex-col justify-between h-full ${inst.status === LoanStatus.PAID || isFixedTermDone || isZeroBalance ? 'bg-emerald-500/5 border-emerald-500/20' : isLateInst ? 'bg-rose-500/5 border-rose-500/20' : isPrepaid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-slate-800'}`}>
                      {isFixedTerm && fixedTermStats ? (
                          <div className="mb-4">
                              <div className="flex justify-between items-end mb-2"><span className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-1"><Clock size={12}/> Contador de Dias</span><span className="text-white font-black text-xs">{fixedTermStats.paidDays} / {fixedTermStats.totalDays} Pagos</span></div>
                              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-3"><div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{width: `${fixedTermStats.progressPercent}%`}}></div></div>
                              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center"><p className="text-[8px] text-slate-500 uppercase font-black mb-1 flex items-center justify-center gap-1"><Calculator size={10}/> Data Coberta (Pago Até)</p><p className="text-sm font-black text-emerald-400">{formatBRDate(fixedTermStats.paidUntilDate)}</p><div className="h-px w-full bg-slate-800 my-2"></div><p className="text-[9px] text-slate-400 font-medium">Valor da Diária: {formatMoney(fixedTermStats.dailyValue, isStealthMode)}</p></div>
                          </div>
                      ) : (
                          <div className="flex justify-between items-start mb-3 sm:mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-4"><p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase">{showProgress ? `${realIndex}ª Parcela` : 'Detalhes'}</p>{inst.renewalCount && inst.renewalCount > 0 ? (<span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1" title="Vezes que os juros foram pagos (Renovações)"><RefreshCcw size={8} /> {inst.renewalCount}x</span>) : null}</div>
                              <div className="relative pl-3 border-l-2 border-slate-800 space-y-4 my-2"><div className="relative"><div className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-900"></div><p className="text-[9px] font-bold text-slate-500 uppercase leading-none">{strategy.card.dueDateLabel(inst, loan)}</p><p className={`text-xs font-black ${isPrepaid ? 'text-emerald-400' : isLateInst && !isPaid ? 'text-rose-400' : 'text-white'}`}>{formatBRDate(paidUntilDate)}</p></div></div>
                            </div>
                          </div>
                      )}
                      <p className={`text-[8px] sm:text-[9px] font-bold uppercase mt-2 mb-4 ${statusColor}`}>{statusText}</p>
                      <div className="mb-4 sm:mb-5"><div className="flex flex-col"><div className="flex items-baseline gap-2 flex-wrap"><span className="text-lg sm:text-xl font-black text-white" title="Principal Restante">{formatMoney(debt.principal, isStealthMode)}</span>{(debt.interest + debt.lateFee) > 0 && !isPrepaid && (<><span className="text-slate-500 font-bold">+</span><span className={`text-lg sm:text-xl font-black ${isLateInst && inst.status !== LoanStatus.PAID ? 'text-rose-500' : 'text-emerald-500'}`} title="Juros + Multas">{formatMoney(debt.interest + debt.lateFee, isStealthMode)}</span></>)}</div><p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">{isPrepaid ? 'Principal (Juros Pagos)' : 'Total (Principal + Encargos)'}</p></div></div>
                      {!isActionDisabled ? (<button onClick={() => onPayment(loan, inst, debt)} className="w-full py-2.5 sm:py-3 rounded-xl text-[8px] sm:text-[9px] font-black uppercase transition-all bg-blue-600 text-white shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 hover:bg-blue-500 active:scale-95"><MoreHorizontal size={14} /> Gerenciar</button>) : (<div className="w-full py-2.5 sm:py-3 rounded-xl text-[8px] sm:text-[9px] font-black uppercase transition-all bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center gap-2 cursor-not-allowed"><Lock size={12}/> {isFullyFinalized ? 'Contrato Finalizado' : 'Parcela Paga'}</div>)}
                    </div>
                  );
                })}
              </div>
          )}

          <div className="flex flex-col gap-3 pt-4 border-t border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={onPortalLink} className="w-full sm:w-auto px-5 py-3 bg-slate-800 text-blue-400 rounded-2xl hover:text-white hover:bg-blue-600 transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase">
              <LinkIcon size={14} /> Portal do Cliente
            </button>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
              <button onClick={onUploadPromissoria} className="px-3 py-3 bg-slate-800 text-slate-300 rounded-2xl hover:text-white hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase truncate" title="Anexar promissória assinada">
                <Upload size={14} /> Promissória
              </button>
              <button onClick={onUploadDoc} className="px-3 py-3 bg-slate-800 text-slate-300 rounded-2xl hover:text-white hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase truncate" title="Anexar documento">
                <Upload size={14} /> Documento
              </button>
            </div>

            {/* BOTÃO RENEGOCIAR (Só aparece se NÃO tiver acordo ativo e NÃO estiver finalizado) */}
            {!loan.isArchived && !isFullyFinalized && !hasActiveAgreement && (
                <button onClick={() => onRenegotiate(loan)} className="w-full sm:w-auto px-5 py-3 bg-indigo-950/50 text-indigo-400 border border-indigo-500/30 rounded-2xl hover:text-white hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase">
                    <Handshake size={14}/> Renegociar (Inadimplência)
                </button>
            )}

            {!loan.isArchived && !isFullyFinalized && !hasActiveAgreement && (
              <button onClick={onEdit} className="w-full sm:w-auto px-5 py-3 bg-slate-800 text-slate-400 rounded-2xl hover:text-white hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase">
                <FileEdit size={14} /> Editar Contrato
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
