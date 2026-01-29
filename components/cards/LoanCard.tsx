
import React from 'react';
import {
  Phone, Calendar, ShieldAlert, FileEdit, MessageSquare, RotateCcw,
  Archive, Trash2, History, CheckCircle2,
  Link as LinkIcon, Upload, Handshake
} from 'lucide-react';
import { Loan, CapitalSource, LedgerEntry, Agreement, AgreementInstallment, UserProfile, Installment } from '../../types';
import { formatBRDate } from '../../utils/dateHelpers';
import { formatMoney } from '../../utils/formatters';
import { asArray, asString } from '../../utils/safe';
import { AgreementView } from '../../features/agreements/components/AgreementView';
import { useLoanCardComputed } from './hooks/useLoanCardComputed';
import { LedgerList } from './components/LedgerList';
import { InstallmentGrid } from './components/InstallmentGrid';

interface LoanCardProps {
  loan: Loan;
  sources: CapitalSource[];
  isExpanded: boolean;
  activeUser: UserProfile | null;
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
  onRenegotiate: (loan: Loan) => void;
  onAgreementPayment: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void;
  onRefresh: () => void;
  isStealthMode?: boolean;
}

export const LoanCard: React.FC<LoanCardProps> = ({
  loan, sources, isExpanded, activeUser, onToggleExpand, onEdit, onMessage, onArchive,
  onRestore, onDelete, onNote, onPayment, onPortalLink, onUploadPromissoria,
  onUploadDoc, onViewPromissoria, onViewDoc, onReverseTransaction,
  onRenegotiate, onAgreementPayment, onRefresh, isStealthMode
}) => {
  const {
    strategy,
    showProgress,
    isPaid,
    isLate,
    isCritical,
    hasNotes,
    isDailyFree,
    isFixedTerm,
    hasActiveAgreement,
    isFullyFinalized,
    fixedTermStats,
    cardStyle,
    iconStyle,
    allLedger,
    orderedInstallments,
    isZeroBalance
  } = useLoanCardComputed(loan, sources, isStealthMode);

  const rawAgreement = loan.activeAgreement;
  const safeAgreement: Agreement | null = hasActiveAgreement && rawAgreement ? {
      ...rawAgreement,
      id: asString(rawAgreement.id, `ag-temp-${loan.id}`, 'agreement.id'),
      type: asString(rawAgreement.type, 'PARCELADO_COM_JUROS') as any,
      installments: asArray(rawAgreement.installments),
      createdAt: rawAgreement.createdAt || (rawAgreement as any).created_at || new Date().toISOString(),
      negotiatedTotal: rawAgreement.negotiatedTotal || (rawAgreement as any).total_negociado || 0,
      totalDebtAtNegotiation: rawAgreement.totalDebtAtNegotiation || (rawAgreement as any).total_base || 0,
      interestRate: rawAgreement.interestRate || (rawAgreement as any).juros_mensal_percent || 0
  } : null;

  const debtorNameSafe = asString(loan.debtorName, 'Sem Nome');
  const debtorInitial = debtorNameSafe[0] || '?';

  // Ícone ou Foto do Cliente
  const renderAvatar = () => {
      if (loan.clientAvatarUrl) {
          return (
              <img 
                  src={loan.clientAvatarUrl} 
                  alt={debtorNameSafe} 
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-lg border-2 ${isCritical ? 'border-rose-500' : 'border-slate-800'}`}
              />
          );
      }
      return (
          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl transition-all flex-shrink-0 ${iconStyle}`}>
            {isCritical && !hasActiveAgreement ? <ShieldAlert size={24} /> : isFullyFinalized ? <CheckCircle2 size={24}/> : debtorInitial}
          </div>
      );
  };

  return (
    <div
      className={`border transition-all duration-300 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 hover:shadow-2xl cursor-pointer overflow-hidden active:scale-[0.99] ${cardStyle} ${isExpanded ? 'ring-1 ring-white/10' : ''} ${isCritical && !hasActiveAgreement ? 'animate-pulse ring-1 ring-rose-500' : ''}`}
      onClick={onToggleExpand}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4 sm:gap-6 w-full">
          {renderAvatar()}

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-base sm:text-xl text-white truncate flex items-center gap-2">
                {debtorNameSafe}
                {isFullyFinalized && <span className="bg-emerald-500 text-emerald-950 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Finalizado</span>}
                {hasActiveAgreement && <span className="bg-indigo-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Em Acordo</span>}
            </h3>

            <div className="flex flex-wrap gap-2 mt-1 sm:mt-2">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Phone size={10} /> {asString(loan.debtorPhone)}
              </p>
              {!hasActiveAgreement && (() => {
                const safeInsts = asArray<Installment>(loan.installments);
                const nextInst = safeInsts.find((i) => i.status !== 'PAID') || safeInsts[safeInsts.length - 1];
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

      <div className="grid grid-cols-3 gap-2 sm:gap-8 pt-6 sm:pt-8 border-t border-white/5 mt-6 sm:mt-8">
        <div className="space-y-1">
          <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Principal</p>
          <p className="font-black text-xs sm:text-base text-white">{formatMoney(loan.principal, isStealthMode)}</p>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Fonte</p>
          <p className="font-black text-[10px] sm:text-xs text-blue-400 truncate max-w-[80px] sm:max-w-none mx-auto">
            {asArray<CapitalSource>(sources).find((s) => s.id === loan.sourceId)?.name || '...'}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Taxa Fixa</p>
          <p className="font-black text-xs sm:text-base text-emerald-500">{loan.interestRate}%</p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-8 sm:mt-10 space-y-6 sm:space-y-8 animate-in slide-in-from-top-4 duration-500" onClick={e => e.stopPropagation()}>
          <div className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <History size={14} className="text-blue-500" /> Histórico & Auditoria
              </h4>
            </div>
            <LedgerList 
                ledger={allLedger} 
                loan={loan} 
                onReverseTransaction={onReverseTransaction} 
                isStealthMode={isStealthMode} 
            />
          </div>

          {hasActiveAgreement && safeAgreement ? (
              <AgreementView 
                  agreement={safeAgreement} 
                  loan={loan} 
                  activeUser={activeUser}
                  onUpdate={onRefresh}
                  onPayment={(inst) => onAgreementPayment(loan, safeAgreement, inst)}
              />
          ) : (
              <InstallmentGrid
                  loan={loan}
                  orderedInstallments={orderedInstallments}
                  fixedTermStats={fixedTermStats}
                  isPaid={isPaid}
                  isLate={isLate}
                  isZeroBalance={isZeroBalance}
                  isFullyFinalized={isFullyFinalized}
                  showProgress={showProgress}
                  strategy={strategy}
                  isDailyFree={isDailyFree}
                  isFixedTerm={isFixedTerm}
                  onPayment={onPayment}
                  onAgreementPayment={onAgreementPayment}
                  isStealthMode={isStealthMode}
              />
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
