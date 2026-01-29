
import { useState, useRef, useCallback } from 'react';
import { CapitalSource, Loan, Client, Installment, AgreementInstallment } from '../types';
import { ModalType, ModalState } from '../contexts/ModalContext';

export const useUiState = () => {
  const [activeModal, setActiveModal] = useState<ModalState | null>(null);

  const openModal = useCallback((type: ModalType, payload?: any) => {
      setActiveModal({ type, payload });
  }, []);

  const closeModal = useCallback(() => {
      setActiveModal(null);
      setEditingLoan(null);
      setPaymentModal(null);
      setConfirmation(null);
  }, []);

  const [noteText, setNoteText] = useState('');
  const [editingSource, setEditingSource] = useState<CapitalSource | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState<{loan: Loan, inst: Installment | AgreementInstallment, amountPaid: number, type: string} | null>(null);
  const [masterEditUser, setMasterEditUser] = useState<any>(null); 
  const [sacSearch, setSacSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', document: '', email: '', address: '', city: '', state: '', notes: '' });
  const [clientDraftAccessCode, setClientDraftAccessCode] = useState<string>('');
  const [clientDraftNumber, setClientDraftNumber] = useState<string>('');
  const [sourceForm, setSourceForm] = useState({ name: '', type: 'BANK', balance: '' });
  const [addFundsValue, setAddFundsValue] = useState('');
  const [paymentModal, setPaymentModal] = useState<{loan: Loan, inst: Installment, calculations: any} | null>(null);
  const [renegotiationModalLoan, setRenegotiationModalLoan] = useState<Loan | null>(null);
  const [messageModalLoan, setMessageModalLoan] = useState<Loan | null>(null);
  const [withdrawValue, setWithdrawValue] = useState('');
  const [withdrawSourceId, setWithdrawSourceId] = useState('');
  const [paymentType, setPaymentType] = useState<'FULL' | 'RENEW_INTEREST' | 'RENEW_AV' | 'LEND_MORE'>('FULL');
  const [avAmount, setAvAmount] = useState('');
  const [refundChecked, setRefundChecked] = useState(true);

  const [confirmation, setConfirmation] = useState<{
    type: 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'DELETE_CLIENT' | 'DELETE_SOURCE' | 'REVERSE_TRANSACTION', 
    target: any,
    title?: string,
    message?: string,
    showRefundOption?: boolean,
    extraData?: any
  } | null>(null);

  const [promissoriaUploadLoanId, setPromissoriaUploadLoanId] = useState<string | null>(null);
  const [extraDocUploadLoanId, setExtraDocUploadLoanId] = useState<string | null>(null);
  const [extraDocKind, setExtraDocKind] = useState<'CONFISSAO' | null>(null);

  // ESTADOS DE IMPORTAÇÃO (CORREÇÃO: Adicionando estados faltantes)
  const [importSheets, setImportSheets] = useState<any[]>([]);
  const [importSheetNames, setImportSheetNames] = useState<string[]>([]);
  const [importCurrentSheet, setImportCurrentSheet] = useState<any>(null);
  const [importMapping, setImportMapping] = useState<Record<string, number>>({});
  const [importCandidates, setImportCandidates] = useState<any[]>([]);
  const [selectedImportIndices, setSelectedImportIndices] = useState<number[]>([]);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedClientsToDelete, setSelectedClientsToDelete] = useState<string[]>([]);
  const [deleteAccountAgree, setDeleteAccountAgree] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('');
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [showNavHub, setShowNavHub] = useState(false);

  const fileInputBackupRef = useRef<HTMLInputElement>(null);
  const fileInputExcelRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const promissoriaFileInputRef = useRef<HTMLInputElement>(null);
  const extraDocFileInputRef = useRef<HTMLInputElement>(null);

  return {
    activeModal, openModal, closeModal,
    noteText, setNoteText,
    editingSource, setEditingSource,
    editingLoan, setEditingLoan,
    editingClient, setEditingClient,
    selectedLoanId, setSelectedLoanId,
    showReceipt, setShowReceipt,
    masterEditUser, setMasterEditUser,
    sacSearch, setSacSearch,
    isSaving, setIsSaving,
    isProcessingPayment, setIsProcessingPayment,
    clientForm, setClientForm,
    clientDraftAccessCode, setClientDraftAccessCode,
    clientDraftNumber, setClientDraftNumber,
    sourceForm, setSourceForm,
    addFundsValue, setAddFundsValue,
    paymentModal, setPaymentModal,
    messageModalLoan, setMessageModalLoan,
    withdrawValue, setWithdrawValue,
    withdrawSourceId, setWithdrawSourceId,
    paymentType, setPaymentType,
    avAmount, setAvAmount,
    refundChecked, setRefundChecked,
    confirmation, setConfirmation,
    promissoriaUploadLoanId, setPromissoriaUploadLoanId,
    extraDocUploadLoanId, setExtraDocUploadLoanId,
    extraDocKind, setExtraDocKind,
    renegotiationModalLoan, setRenegotiationModalLoan,
    
    // Estados de Importação
    importSheets, setImportSheets,
    importSheetNames, setImportSheetNames,
    importCurrentSheet, setImportCurrentSheet,
    importMapping, setImportMapping,
    importCandidates, setImportCandidates,
    selectedImportIndices, setSelectedImportIndices,
    pendingImportFile, setPendingImportFile,

    isBulkDeleteMode, setIsBulkDeleteMode,
    selectedClientsToDelete, setSelectedClientsToDelete,
    deleteAccountAgree, setDeleteAccountAgree,
    deleteAccountConfirm, setDeleteAccountConfirm,
    resetPasswordInput, setResetPasswordInput,
    isStealthMode, setIsStealthMode,
    showNavHub, setShowNavHub,

    fileInputBackupRef, fileInputExcelRef, profilePhotoInputRef, promissoriaFileInputRef, extraDocFileInputRef
  };
};
