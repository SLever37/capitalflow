
import React from 'react';
import { useLoanCardComputed } from './hooks/useLoanCardComputed';
import { LoanCardProps } from './LoanCardComposition/types';
import { getDebtorNameSafe, getNextInstallment, getNextDueDate, getDaysUntilDue } from './LoanCardComposition/helpers';

// Blocos de UI
import { Header } from './LoanCardComposition/Header';
import { QuickActions } from './LoanCardComposition/QuickActions';
import { Ledger } from './LoanCardComposition/Ledger';
import { Body } from './LoanCardComposition/Body';
import { Footer } from './LoanCardComposition/Footer';

// Re-exporta a interface para manter compatibilidade
export type { LoanCardProps };

export const LoanCard: React.FC<LoanCardProps> = (props) => {
  const {
    loan, sources, isExpanded, activeUser, onToggleExpand,
    onEdit, onMessage, onArchive, onRestore, onDelete, onNote,
    onPayment, onPortalLink, onViewDoc, onUploadPromissoria, onUploadDoc,
    onReverseTransaction, onRenegotiate, onAgreementPayment, onRefresh,
    onNewAporte, isStealthMode
  } = props;

  // Lógica de Negócio
  const computed = useLoanCardComputed(loan, sources, isStealthMode);
  
  const {
    strategy, showProgress, isPaid, isLate, hasNotes, isDailyFree, isFixedTerm,
    hasActiveAgreement, isFullyFinalized, fixedTermStats, cardStyle, iconStyle,
    allLedger, orderedInstallments, isZeroBalance
  } = computed;

  // Helpers de Apresentação
  const debtorNameSafe = getDebtorNameSafe(loan);
  const nextInstallment = getNextInstallment(orderedInstallments);
  const nextDueDate = getNextDueDate(nextInstallment);
  const daysUntilDue = getDaysUntilDue(nextDueDate);

  // Definição da cor da borda lateral baseada no status
  let borderLeftColor = "border-l-slate-700"; // Padrão
  if (isFullyFinalized) borderLeftColor = "border-l-emerald-500";
  else if (hasActiveAgreement) borderLeftColor = "border-l-indigo-500";
  else if (isLate) borderLeftColor = "border-l-rose-500";
  else if (daysUntilDue <= 3) borderLeftColor = "border-l-amber-500";
  else borderLeftColor = "border-l-blue-500";

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900 hover:border-slate-700 hover:shadow-xl hover:shadow-slate-900/50 group cursor-pointer border-l-4 ${borderLeftColor}`}
      onClick={onToggleExpand}
    >
      {/* Container Principal com Padding */}
      <div className="p-5 sm:p-6">
        <Header 
          loan={loan}
          debtorNameSafe={debtorNameSafe}
          isFullyFinalized={isFullyFinalized}
          isLate={isLate}
          hasActiveAgreement={hasActiveAgreement}
          daysUntilDue={daysUntilDue}
          nextDueDate={nextDueDate}
          iconStyle={iconStyle}
          isStealthMode={isStealthMode}
          isExpanded={isExpanded}
        />

        {/* Área Expansível */}
        {isExpanded && (
          <div 
              className="mt-6 pt-6 border-t border-slate-800/50 space-y-6 animate-in slide-in-from-top-2 duration-300 cursor-default" 
              onClick={e => e.stopPropagation()}
          >
            <QuickActions 
              hasNotes={hasNotes}
              onMessage={onMessage}
              onNote={onNote}
              onPortalLink={onPortalLink}
              onViewDoc={onViewDoc}
              onUploadPromissoria={onUploadPromissoria}
              onUploadDoc={onUploadDoc}
            />

            <Body 
              hasActiveAgreement={hasActiveAgreement}
              loan={loan}
              activeUser={activeUser}
              activeAgreement={loan.activeAgreement}
              onRefresh={onRefresh}
              onAgreementPayment={onAgreementPayment}
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
              isStealthMode={isStealthMode}
            />

            <Ledger 
              allLedger={allLedger}
              loan={loan}
              onReverseTransaction={onReverseTransaction}
              isStealthMode={isStealthMode}
            />

            <Footer 
              loan={loan}
              isFullyFinalized={isFullyFinalized}
              hasActiveAgreement={hasActiveAgreement}
              isLate={isLate}
              onNewAporte={onNewAporte}
              onEdit={onEdit}
              onRenegotiate={onRenegotiate}
              onArchive={onArchive}
              onRestore={onRestore}
              onDelete={onDelete}
            />
          </div>
        )}
      </div>
    </div>
  );
};
