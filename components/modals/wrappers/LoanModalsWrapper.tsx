
import React from 'react';
import { useModal } from '../../../contexts/ModalContext';
import { LoanForm } from '../../LoanForm';
import { ClientModals } from '../ModalGroups';
import { NewAporteModal } from '../NewAporteModal';

export const LoanModalsWrapper = () => {
    const { activeModal, closeModal, ui, loanCtrl, clients, sources, activeUser, fetchFullData } = useModal();

    if (activeModal?.type === 'LOAN_FORM') {
        return (
            <LoanForm 
                onAdd={loanCtrl.handleSaveLoan} 
                onCancel={closeModal} 
                initialData={activeModal.payload}
                clients={clients} 
                sources={sources} 
                userProfile={activeUser} 
            />
        );
    }

    if (activeModal?.type === 'CLIENT_FORM') {
        return <ClientModals />;
    }

    if (activeModal?.type === 'NEW_APORTE' && ui.newAporteModalLoan && activeUser) {
        return (
            <NewAporteModal
                open={true}
                onClose={closeModal}
                loan={ui.newAporteModalLoan}
                activeUser={activeUser}
                sources={sources}
                installments={ui.newAporteModalLoan.installments}
                onSuccess={() => { closeModal(); fetchFullData(activeUser.id); }}
                isStealthMode={ui.isStealthMode}
            />
        );
    }

    return null;
};
