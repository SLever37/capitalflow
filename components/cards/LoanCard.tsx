
import React from 'react';
import { useLoanCardComputed } from './hooks/useLoanCardComputed';
import { LoanCardProps } from './LoanCardComposition/types';
import { getDebtorNameSafe, getNextInstallment, getNextDueDate, getDaysUntilDue } from './LoanCardComposition/helpers';

// Blocos de UI
import { Header } from './LoanCardComposition/Header';
import { QuickActions } from './LoanCardComposition/QuickActions';
import { Body } from './LoanCardComposition/Body';
import { Footer } from './LoanCardComposition/Footer';
import { Ledger } from './LoanCardComposition/Ledger';

// Re-exporta a interface para manter compatibilidade
export type { LoanCardProps };

export const LoanCard: React.FC<LoanCardProps> = (props) => {
  const {
    loan, sources, isStealthMode, activeUser, onEdit, onMessage, onArchive,
    onRestore, onDelete, onNote, onPayment, onPortalLink, onUploadPromissoria,
    onUploadDoc, onViewPromissoria, onViewDoc, onReviewSignal, onOpenComprovante,
    onReverseTransaction, onRenegotiate, onNewAporte, onAgreementPayment,
    onNavigate, onRefresh
  } = props;

  const [isExpanded, setIsExpanded] = React.useState(false);

  // Lógica de Negócio
  const computed = useLoanCardComputed(loan, sources, isStealthMode);
  
  const {
    isLate, hasActiveAgreement, isFullyFinalized, iconStyle,
    orderedInstallments, totalDebt, activeAgreement, fixedTermStats,
    isPaid, isZeroBalance, showProgress, strategy, isDailyFree, isFixedTerm
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

  const handleCardClick = () => {
    if (isExpanded) {
      window.history.pushState({}, '', `/contrato/${loan.id}`);
      if (onNavigate) {
        onNavigate(loan.id);
      }
    } else {
      setIsExpanded(true);
    }
  };

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900 hover:border-slate-700 hover:shadow-xl hover:shadow-slate-900/50 group cursor-pointer border-l-4 ${borderLeftColor} ${isExpanded ? 'ring-2 ring-blue-500/20' : ''}`}
      onClick={handleCardClick}
    >
      {/* Container Principal com Padding */}
      <div className="p-5 sm:p-6 space-y-6">
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
          currentDebt={totalDebt}
        />

        {isExpanded && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <QuickActions 
              hasNotes={!!loan.notes}
              onMessage={(e) => { e.stopPropagation(); onMessage(loan); }}
              onNote={(e) => { e.stopPropagation(); onNote(loan); }}
              onPortalLink={(e) => { e.stopPropagation(); onPortalLink(loan); }}
              onViewDoc={(e, url) => { e.stopPropagation(); onViewDoc(url); }}
              onUploadPromissoria={(e) => { e.stopPropagation(); onUploadPromissoria?.(loan); }}
              onUploadDoc={(e) => { e.stopPropagation(); onUploadDoc(loan); }}
              onEdit={(e) => { e.stopPropagation(); onEdit(loan); }}
            />

            <Body 
              hasActiveAgreement={hasActiveAgreement}
              loan={loan}
              activeUser={activeUser}
              activeAgreement={activeAgreement}
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

            {loan.ledger && loan.ledger.length > 0 && (
              <Ledger 
                ledger={loan.ledger}
                loan={loan}
                onReverseTransaction={onReverseTransaction}
                onOpenComprovante={onOpenComprovante}
                isStealthMode={isStealthMode}
              />
            )}

            <Footer 
              loan={loan}
              onArchive={() => onArchive(loan)}
              onRestore={() => onRestore(loan)}
              onDelete={() => onDelete(loan)}
              onRenegotiate={() => onRenegotiate(loan)}
              onNewAporte={() => onNewAporte(loan)}
              onEdit={(e) => { e.stopPropagation(); onEdit(loan); }}
              isFullyFinalized={isFullyFinalized}
              hasActiveAgreement={hasActiveAgreement}
              isLate={isLate}
            />
          </div>
        )}
      </div>
    </div>
  );
};
