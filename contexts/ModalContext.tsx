
import React, { createContext, useContext, ReactNode } from 'react';
import { UserProfile, Client, Loan, CapitalSource } from '../types';

// Definição dos Tipos de Modal do Sistema
export type ModalType = 
    | 'LOAN_FORM'
    | 'CLIENT_FORM'
    | 'SOURCE_FORM'
    | 'ADD_FUNDS'
    | 'PAYMENT'
    | 'WITHDRAW'
    | 'CONFIRMATION'
    | 'DONATE'
    | 'CALC'
    | 'AGENDA'
    | 'FLOW'
    | 'MESSAGE_HUB'
    | 'RECEIPT'
    | 'PROOF_VIEW'
    | 'NOTE'
    | 'MASTER_EDIT_USER'
    | 'IMPORT_SHEET_SELECT'
    | 'IMPORT_PREVIEW'
    | 'DELETE_ACCOUNT'
    | 'RESET_DATA'
    | 'RENEGOTIATION'
    | 'AI_ASSISTANT';

export interface ModalState {
    type: ModalType;
    payload?: any;
}

interface ModalContextType {
    // Estado do Modal
    activeModal: ModalState | null;
    openModal: (type: ModalType, payload?: any) => void;
    closeModal: () => void;

    // Estado UI Compartilhado (Forms, Inputs)
    ui: any; 

    // Dados Globais (Necessários pelos Modais)
    activeUser: UserProfile | null;
    clients: Client[];
    sources: CapitalSource[];
    loans: Loan[];

    // Controladores
    loanCtrl: any;
    clientCtrl: any;
    sourceCtrl: any;
    paymentCtrl: any;
    profileCtrl: any;
    adminCtrl: any;
    fileCtrl: any;
    aiCtrl: any;
    
    // Utils
    showToast: (msg: string, type?: any) => void;
    fetchFullData: (id: string) => Promise<void>;
    handleLogout: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<ModalContextType & { children: ReactNode }> = (props) => {
    const { children, ...values } = props;

    // Warning em DEV para payloads inválidos
    // Vite: use import.meta.env.DEV (process.env is not available in the browser)
    const isDev = (import.meta as any).env?.DEV;
    if (isDev && values.activeModal) {
        if (!values.activeModal.type) {
            console.warn("ModalContext: Tentativa de abrir modal sem tipo definido.", values.activeModal);
        }
    }

    return (
        <ModalContext.Provider value={values}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal deve ser usado dentro de um ModalProvider');
    }
    return context;
};
