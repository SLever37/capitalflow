
export enum LoanStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  LATE = 'LATE',
  PARTIAL = 'PARTIAL'
}

export type PaymentMethod = 'PIX' | 'CASH' | 'BANK_TRANSFER' | 'OTHER';

export interface CapitalSource {
  id: string;
  name: string;
  type: 'CASH' | 'CARD' | 'WALLET' | 'BANK';
  balance: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  document: string;
  email?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  createdAt: string;
  access_code?: string;
  client_number?: string;
  cpf?: string;
  cnpj?: string;
  fotoUrl?: string; // Novo Campo
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'PAYMENT_FULL' | 'PAYMENT_PARTIAL' | 'PAYMENT_INTEREST_ONLY' | 'LEND_MORE' | 'WITHDRAW_PROFIT' | 'ADJUSTMENT' | 'ARCHIVE' | 'RESTORE' | 'REFUND_SOURCE_CHANGE' | 'AGREEMENT_PAYMENT';
  category?: 'RECEITA' | 'INVESTIMENTO' | 'RECUPERACAO' | 'ESTORNO' | 'GERAL' | 'AUDIT';
  amount: number;
  principalDelta: number;
  interestDelta: number;
  lateFeeDelta: number;
  sourceId?: string; 
  installmentId?: string;
  agreementId?: string; 
  notes?: string;
}

export interface Installment {
  id: string;
  dueDate: string;
  scheduledPrincipal: number; 
  scheduledInterest: number;  
  amount: number;             
  principalRemaining: number;
  interestRemaining: number;
  lateFeeAccrued: number;     
  avApplied: number;          
  paidPrincipal: number;
  paidInterest: number;
  paidLateFee: number;
  paidTotal: number;
  status: LoanStatus;
  paidDate?: string;
  paidAmount?: number; 
  logs?: string[];
  renewalCount?: number; 
  number?: number; 
}

export interface LoanPolicy {
  interestRate: number;
  finePercent: number;
  dailyInterestPercent: number;
}

export interface PaymentSignal {
  id?: string;
  date: string;
  type: string;
  receiptBase64?: string;
  comprovanteUrl?: string;
  status: string;
  clientViewedAt?: string;
  reviewNote?: string;
}

export interface LoanDocument {
  id: string;
  url: string;
  name: string;
  type: 'PDF' | 'IMAGE' | 'OTHER';
  visibleToClient: boolean;
  uploadedAt: string;
}

export type LoanBillingModality = 'MONTHLY' | 'DAILY_FREE' | 'DAILY_FIXED_TERM';

// --- AGREEMENT TYPES ---
export type AgreementType = 'PARCELADO_SEM_JUROS' | 'PARCELADO_COM_JUROS';
export type AgreementStatus = 'ACTIVE' | 'ATIVO' | 'PAID' | 'BROKEN';

export interface AgreementInstallment {
    id: string;
    agreementId: string;
    number: number;
    dueDate: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'PARTIAL' | 'LATE';
    paidAmount: number;
    paidDate?: string;
}

export interface Agreement {
    id: string;
    loanId: string;
    type: AgreementType;
    totalDebtAtNegotiation: number;
    negotiatedTotal: number;
    interestRate?: number; // Se houver
    installmentsCount: number;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    startDate: string;
    status: AgreementStatus;
    createdAt: string;
    installments: AgreementInstallment[];
}

// --- LEGAL TYPES (Módulo Jurídico) ---
export interface LegalDocumentParams {
    debtorName: string;
    debtorDoc: string;
    debtorPhone?: string; 
    debtorAddress: string;
    creditorName: string;
    creditorDoc: string;
    creditorAddress?: string;
    totalDebt: number;
    originDescription: string; 
    installments: AgreementInstallment[];
    contractDate: string;
    agreementDate: string;
    city: string;
    // Snapshot Integrity
    documentHash?: string;
    documentId?: string;
    timestamp?: string;
}

export interface LegalSignatureMetadata {
    ip: string;
    user_agent: string;
    signed_at: string;
    method: 'ASSINATURA_ELETRONICA' | 'ICP_BRASIL' | 'MANUAL_REGISTER';
    lei_base: string;
    signer_name?: string;
    signer_doc?: string;
}

export interface LegalDocumentRecord {
    id: string;
    agreementId: string;
    type: 'CONFISSAO' | 'PROMISSORIA';
    snapshot: LegalDocumentParams;
    hashSHA256: string;
    status: 'PENDING' | 'SIGNED';
    signatureMetadata?: LegalSignatureMetadata;
    createdAt: string;
}

export interface Loan {
  id: string;
  clientId: string;
  debtorName: string;
  debtorPhone: string;
  debtorDocument: string;
  debtorAddress?: string;
  clientAvatarUrl?: string; // Novo Campo
  sourceId: string;
  preferredPaymentMethod: PaymentMethod;
  pixKey?: string;
  
  billingCycle: LoanBillingModality;
  amortizationType: 'PRICE' | 'BULLET' | 'JUROS';

  principal: number;
  interestRate: number;
  finePercent: number; 
  dailyInterestPercent: number; 
  
  policiesSnapshot?: LoanPolicy;

  startDate: string;
  createdAt?: string; 
  installments: Installment[];
  totalToReceive: number;
  
  ledger: LedgerEntry[]; 
  paymentSignals?: PaymentSignal[];

  notes: string;
  guaranteeDescription?: string;
  attachments?: string[]; 
  documentPhotos?: string[]; 
  customDocuments?: LoanDocument[]; 

  isArchived?: boolean;
  skipWeekends?: boolean;

  // New Link
  activeAgreement?: Agreement; 
}

export interface UserProfile {
  id: string;
  name: string;
  fullName?: string; 
  password?: string;
  recoveryPhrase?: string;
  accessLevel?: number;
  email: string;
  businessName?: string;
  document?: string;
  phone?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  website?: string;
  photo?: string;
  pixKey?: string;
  totalAvailableCapital: number;
  interestBalance: number;
  totalHistoricalInterest?: number; 
  createdAt?: string;
  
  brandColor?: string;
  logoUrl?: string;
  defaultInterestRate?: number;
  defaultFinePercent?: number;
  defaultDailyInterestPercent?: number;
  targetCapital?: number;
  targetProfit?: number;
  
  // App Logic helpers
  lastActiveAt?: string;
}
