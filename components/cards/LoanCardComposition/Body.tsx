
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
    onPayment: (loan: Loan, inst: Installment, calculations: any) => void;
    isStealthMode?: boolean;
}

export const Body: React.FC<BodyProps> = ({
    hasActiveAgreement, loan, activeUser, activeAgreement, onRefresh, onAgreementPayment,
    orderedInstallments, fixedTermStats, isPaid, isLate, isZeroBalance, isFullyFinalized,
    showProgress, strategy, isDailyFree, isFixedTerm, onPayment, isStealthMode
}) => {
    if (hasActiveAgreement && activeAgreement) {
        return (
            <AgreementView
              agreement={activeAgreement}
              loan={loan}
              activeUser={activeUser}
              onUpdate={onRefresh}
              onPayment={(inst) => onAgreementPayment(loan, activeAgreement, inst)}
            />
        );
    }

    return (
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
    );
};
