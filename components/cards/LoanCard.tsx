
import React from 'react';
import { useLoanCardComputed } from './hooks/useLoanCardComputed';
import { LoanCardProps } from './LoanCardComposition/types';
import { getDebtorNameSafe, getNextInstallment, getNextDueDate, getDaysUntilDue } from './LoanCardComposition/helpers';

// Blocos de UI
import { Header } from './LoanCardComposition/Header';

// Re-exporta a interface para manter compatibilidade
export type { LoanCardProps };

export const LoanCard: React.FC<LoanCardProps> = (props) => {
  const {
    loan, sources, isStealthMode
  } = props;

  // Lógica de Negócio
  const computed = useLoanCardComputed(loan, sources, isStealthMode);
  
  const {
    isLate, hasActiveAgreement, isFullyFinalized, iconStyle,
    orderedInstallments, totalDebt
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
      onClick={() => {
        window.history.pushState({}, '', `/contrato/${loan.id}`);
        if (props.onNavigate) {
          props.onNavigate(loan.id);
        }
      }}
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
          isExpanded={false}
          currentDebt={totalDebt} // Passa o total calculado real para exibir no card
        />
      </div>
    </div>
  );
};
