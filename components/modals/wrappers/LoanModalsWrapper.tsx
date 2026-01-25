
import React from 'react';
import { useModal } from '../../../contexts/ModalContext';
import { LoanForm } from '../../LoanForm';
import { ClientModals } from '../ModalGroups';

export const LoanModalsWrapper = () => {
    const { activeModal, closeModal, ui, loanCtrl, clients, sources, activeUser } = useModal();

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

    return null;
};
