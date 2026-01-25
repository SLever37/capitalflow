
import { useState, useRef } from 'react';
import { CapitalSource, Loan, Client, Installment, LedgerEntry, AgreementInstallment } from '../types';

export const useUiState = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState<CapitalSource | null>(null);
  
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false); 

  const [donateModal, setDonateModal] = useState(false);
  const [resetDataModal, setResetDataModal] = useState(false);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deleteAccountAgree, setDeleteAccountAgree] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('');
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  
  const [showNavHub, setShowNavHub] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState(false);
  
  // Stealth Mode State
  const [isStealthMode, setIsStealthMode] = useState(false);
  
  const [noteModalLoan, setNoteModalLoan] = useState<Loan | null>(null);
  const [noteText, setNoteText] = useState('');
  
  const [editingSource, setEditingSource] = useState<CapitalSource | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  
  const [showReceipt, setShowReceipt] = useState<{loan: Loan, inst: Installment | AgreementInstallment, amountPaid: number, type: string} | null>(null);
  const [viewProofModal, setViewProofModal] = useState<string | null>(null);
  
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
  
  // AGREEMENT MODAL STATE
  const [renegotiationModalLoan, setRenegotiationModalLoan] = useState<Loan | null>(null);

  const [messageModalLoan, setMessageModalLoan] = useState<Loan | null>(null);
  const [withdrawModal, setWithdrawModal] = useState(false);
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

  const [importCandidates, setImportCandidates] = useState<any[]>([]);
  const [selectedImportIndices, setSelectedImportIndices] = useState<number[]>([]);
  const [showImportPreviewModal, setShowImportPreviewModal] = useState(false);
  
  const [importSheetNames, setImportSheetNames] = useState<string[]>([]);
  const [showSheetSelectModal, setShowSheetSelectModal] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedClientsToDelete, setSelectedClientsToDelete] = useState<string[]>([]);

  const fileInputBackupRef = useRef<HTMLInputElement>(null);
  const fileInputExcelRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const promissoriaFileInputRef = useRef<HTMLInputElement>(null);
  const extraDocFileInputRef = useRef<HTMLInputElement>(null);

  return {
    isFormOpen, setIsFormOpen,
    isClientModalOpen, setIsClientModalOpen,
    isSourceModalOpen, setIsSourceModalOpen,
    isAddFundsModalOpen, setIsAddFundsModalOpen,
    isAiAssistantOpen, setIsAiAssistantOpen,
    donateModal, setDonateModal,
    resetDataModal, setResetDataModal,
    deleteAccountModal, setDeleteAccountModal,
    deleteAccountAgree, setDeleteAccountAgree,
    deleteAccountConfirm, setDeleteAccountConfirm,
    resetPasswordInput, setResetPasswordInput,
    showNavHub, setShowNavHub,
    showCalcModal, setShowCalcModal,
    showAgendaModal, setShowAgendaModal,
    showFlowModal, setShowFlowModal,
    isStealthMode, setIsStealthMode,
    noteModalLoan, setNoteModalLoan,
    noteText, setNoteText,
    editingSource, setEditingSource,
    editingLoan, setEditingLoan,
    editingClient, setEditingClient,
    selectedLoanId, setSelectedLoanId,
    showReceipt, setShowReceipt,
    viewProofModal, setViewProofModal,
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
    withdrawModal, setWithdrawModal,
    withdrawValue, setWithdrawValue,
    withdrawSourceId, setWithdrawSourceId,
    paymentType, setPaymentType,
    avAmount, setAvAmount,
    refundChecked, setRefundChecked,
    confirmation, setConfirmation,
    promissoriaUploadLoanId, setPromissoriaUploadLoanId,
    extraDocUploadLoanId, setExtraDocUploadLoanId,
    extraDocKind, setExtraDocKind,
    
    // Agreements
    renegotiationModalLoan, setRenegotiationModalLoan,

    importCandidates, setImportCandidates,
    selectedImportIndices, setSelectedImportIndices,
    showImportPreviewModal, setShowImportPreviewModal,
    importSheetNames, setImportSheetNames,
    showSheetSelectModal, setShowSheetSelectModal,
    pendingImportFile, setPendingImportFile,
    isBulkDeleteMode, setIsBulkDeleteMode,
    selectedClientsToDelete, setSelectedClientsToDelete,

    fileInputBackupRef, fileInputExcelRef, profilePhotoInputRef, promissoriaFileInputRef, extraDocFileInputRef
  };
};
