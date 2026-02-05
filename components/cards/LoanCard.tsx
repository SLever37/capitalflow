
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
    onPayment, onPortalLink, onViewDoc, onUploadPromissoria,
    onReverseTransaction, onRenegotiate, onAgreementPayment, onRefresh,
    onNewAporte, isStealthMode
  } = props;

  // Lógica de Negócio (Hook centralizado mantido)
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

  return (
    <div
      className={`border transition-all rounded-3xl p-5 cursor-pointer relative overflow-hidden group ${cardStyle}`}
      onClick={onToggleExpand}
    >
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
      />

      {isExpanded && (
        <div 
            className="mt-4 pt-4 border-t border-slate-800/50 space-y-5 animate-in slide-in-from-top-2 duration-300 cursor-default" 
            onClick={e => e.stopPropagation()}
        >
          <QuickActions 
            hasNotes={hasNotes}
            onMessage={onMessage}
            onNote={onNote}
            onPortalLink={onPortalLink}
            onViewDoc={onViewDoc}
            onUploadPromissoria={onUploadPromissoria}
          />

          <Ledger 
            allLedger={allLedger}
            loan={loan}
            onReverseTransaction={onReverseTransaction}
            isStealthMode={isStealthMode}
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
  );
};
