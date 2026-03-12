
import React from 'react';
import { AgreementView } from '../../../features/agreements/components/AgreementView';
import { InstallmentGrid } from '../components/InstallmentGrid';
import { Loan, UserProfile, Installment, Agreement, AgreementInstallment } from '../../../types';

interface BodyProps {
    hasActiveAgreement: boolean;
    loan: Loan;
    activeUser: UserProfile | null;
    activeAgreement?: Agreement;
    onRefresh: () => void;
    onAgreementPayment: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void;
    orderedInstallments: Installment[];
    fixedTermStats: any;
    isPaid: boolean;
    isLate: boolean;
    isZeroBalance: boolean;
    isFullyFinalized: boolean;
    showProgress: boolean;
    strategy: any;
    isDailyFree: boolean;
    isFixedTerm: boolean;
    isStealthMode?: boolean;
}

export const Body: React.FC<BodyProps> = ({
    hasActiveAgreement, loan, activeUser, activeAgreement, onRefresh, onAgreementPayment,
    orderedInstallments, fixedTermStats, isPaid, isLate, isZeroBalance, isFullyFinalized,
    showProgress, strategy, isDailyFree, isFixedTerm, isStealthMode
}) => {
    return (
        <div className="space-y-6">
            {hasActiveAgreement ? (
                <div className="bg-slate-950/50 border border-slate-800/50 p-6 rounded-2xl text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Contrato Renegociado</p>
                    <p className="text-xs text-slate-500 font-medium">As informações de parcelas e pagamentos estão disponíveis nos detalhes do contrato.</p>
                </div>
            ) : (
                <>
                    {/* Sempre exibe as parcelas originais se não houver acordo ativo */}
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
                        onAgreementPayment={onAgreementPayment}
                        isStealthMode={isStealthMode}
                    />
                </>
            )}
        </div>
    );
};
