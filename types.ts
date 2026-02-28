// types.ts

/* =====================================================
   LOAN CORE
===================================================== */

export enum LoanStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  LATE = 'LATE',
  PARTIAL = 'PARTIAL'
}

export type PaymentMethod =
  | 'PIX'
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'OTHER';

export interface CapitalSource {
  id: string;
  profile_id: string;
  name: string;
  balance: number;
  type: 'PROPRIO' | 'TERCEIROS' | 'MISTO';
  description?: string;
  created_at?: string;
}

export type SortOption = 'RECENT' | 'NAME' | 'VALUE' | 'STATUS' | 'DUE_DATE_ASC' | 'NAME_ASC' | 'CREATED_DESC' | 'UPDATED_DESC';

export type AppTab = 'DASHBOARD' | 'CLIENTS' | 'LEGAL' | 'SOURCES' | 'PROFILE' | 'TEAM' | 'PERSONAL_FINANCE' | 'LEADS' | 'ACQUISITION' | 'SETTINGS';

export type LoanBillingModality =
  | 'MONTHLY'
  | 'DAILY_FREE'
  | 'DAILY_FIXED_TERM'
  | 'DAILY'
  | 'DAILY_30_INTEREST'
  | 'DAILY_30_CAPITAL'
  | 'DAILY_FIXED';

export interface LoanPolicy {
  interestRate: number;
  finePercent: number;
  dailyInterestPercent: number;
}

/* =====================================================
   USER PROFILE
===================================================== */

export interface UserProfile {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  role?: string;
  fullName?: string;
  businessName?: string;
  document?: string;
  address?: string;
  city?: string;
  state?: string;
  pixKey?: string;
  defaultInterestRate?: number;
  defaultFinePercent?: number;
  defaultDailyInterestPercent?: number;
  interestBalance?: number;
  accessLevel?: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  phone?: string;
  password?: string; // This should ideally not be part of a client-side type
  ui_nav_order?: AppTab[];
  ui_hub_order?: AppTab[];
  supervisor_id?: string;
  photo?: string;
  totalAvailableCapital?: number;
  addressNumber?: string;
  neighborhood?: string;
  brandColor?: string;
  zipCode?: string;
  logoUrl?: string;
  recoveryPhrase?: string;
  targetCapital?: number;
  targetProfit?: number;
  createdAt?: string;
}

/* =====================================================
   CLIENT
===================================================== */

export interface Client {
  id: string;
  profile_id: string;
  name: string;
  phone: string;
  document: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
  fotoUrl?: string;
  createdAt: string;
  access_code?: string;
  client_number?: string;
}

/* =====================================================
   AGREEMENTS
===================================================== */

export type AgreementType =
  | 'PARCELADO_COM_JUROS'
  | 'PARCELADO_SEM_JUROS'
  | 'QUITACAO';

export type AgreementStatus =
  | 'ACTIVE'
  | 'PAID'
  | 'BROKEN';

export interface AgreementInstallment {
  id: string;
  agreementId: string;
  number: number;
  dueDate: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'LATE' | 'PARTIAL';
  paidAmount: number;
  paidDate?: string;
}

export interface Agreement {
  id: string;
  loanId: string;
  type?: AgreementType;
  totalDebtAtNegotiation: number;
  negotiatedTotal: number;
  interestRate: number;
  installmentsCount: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  startDate: string;
  status: AgreementStatus;
  createdAt: string;
  installments?: AgreementInstallment[];
}

/* =====================================================
   LOAN DOCUMENTS
===================================================== */

export interface LoanDocument {
  id: string;
  url: string;
  name: string;
  type: 'IMAGE' | 'PDF';
  visibleToClient: boolean;
  uploadedAt: string;
}

/* =====================================================
   INSTALLMENTS + LEDGER
===================================================== */

export interface Installment {
  id: string;
  dueDate: string;
  amount: number;
  principalRemaining: number;
  interestRemaining: number;
  lateFeeAccrued: number;
  paidTotal: number;
  status: LoanStatus;
  scheduledPrincipal: number;
  scheduledInterest: number;
  paidPrincipal: number;
  paidInterest: number;
  paidLateFee: number;
  renewalCount?: number;
  paidDate?: string;
  avApplied?: number;
  paidAmount?: number;
  number?: number;
  logs?: string[];
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  amount: number;
  principalDelta: number;
  interestDelta: number;
  lateFeeDelta: number;
  sourceId?: string;
  installmentId?: string;
  agreementId?: string;
  notes?: string;
  category?: string;
}

/* =====================================================
   LOAN
===================================================== */

export interface Loan {
  id: string;
  clientId: string;
  profile_id: string;
  owner_id?: string;
  operador_responsavel_id?: string;
  debtorName: string;
  debtorPhone: string;
  debtorDocument: string;
  debtorAddress?: string;
  pixKey?: string;
  guaranteeDescription?: string;
  sourceId: string;
  preferredPaymentMethod: PaymentMethod;
  principal: number;
  interestRate: number;
  finePercent: number;
  dailyInterestPercent: number;
  billingCycle: LoanBillingModality;
  startDate: string;
  installments: Installment[];
  totalToReceive: number;
  ledger: LedgerEntry[];
  notes: string;
  status: LoanStatus;
  isArchived?: boolean;
  skipWeekends?: boolean;
  clientAvatarUrl?: string;
  activeAgreement?: Agreement;
  paymentSignals?: any[];
  customDocuments?: LoanDocument[];
  createdAt?: string;
  updatedAt?: string;
  attachments?: string[];
  documentPhotos?: string[];
  policiesSnapshot?: LoanPolicy | null;
  amortizationType?: 'JUROS' | 'PRICE' | 'SAC';
  fundingTotalPayable?: number;
  fundingCost?: number;
  fundingProvider?: string;
  fundingFeePercent?: number;
  portalToken?: string;
  portalShortcode?: string;
  witnesses?: LegalWitness[];
}

/* =====================================================
   LEGAL
===================================================== */

export interface LegalWitness {
  id?: string;
  name: string;
  document: string;
}

export interface LegalDocumentParams {
  loanId: string;
  clientName: string;
  amount: number;
  creditorName?: string;
  creditorDoc?: string;
  creditorAddress?: string;
  debtorName?: string;
  debtorDoc?: string;
  debtorPhone?: string;
  debtorAddress?: string;
  totalDebt?: number;
  originDescription?: string;
  installments?: AgreementInstallment[];
  city?: string;
  state?: string;
  witnesses?: LegalWitness[];
  contractDate?: string;
  agreementDate?: string;
  timestamp?: string;
}

export interface LegalDocumentRecord {
  id: string;
  loanId: string;
  type?: string;
  created_at: string;
  public_access_token?: string;
  hashSHA256?: string;
  agreementId?: string;
  snapshot?: LegalDocumentParams;
  status?: 'SIGNED' | 'PENDING';
}

/* =====================================================
   CALENDAR
===================================================== */

/* =====================================================
   CAMPAIGN & LEADS
===================================================== */

export interface Campaign {
  id: string;
  profile_id: string;
  name: string;
  description?: string;
  public_url?: string;
  short_code?: string;
  created_at?: string;
  is_active?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  imageUrl?: string;
  clicks?: number;
  leads?: number;
  values: number[];
  messageTemplate?: string;
  source?: string; // Assuming 'source' is a string field for campaign origin
  link?: string;
  createdAt?: string;
}

export interface Lead {
  id: string;
  profile_id: string;
  nome: string;
  whatsapp: string;
  email?: string;
  notes?: string;
  status?: 'NOVO' | 'EM_ATENDIMENTO' | 'CONVERTIDO' | 'REJEITADO';
  created_at?: string;
  valor_solicitado: number;
  origem?: string;
  utm_source?: string;
  utm_campaign?: string;
}

export interface CampaignLead {
  id: string;
  campaignId: string;
  name: string;
  whatsapp: string;
  cpf?: string;
  selectedValue: number;
  createdAt: string;
  lgpd?: boolean;
}

/* =====================================================
   CALENDAR
===================================================== */

export type LoanStatusFilter =
  | 'TODOS'
  | 'ATRASADOS'
  | 'EM_DIA'
  | 'PAGOS'
  | 'ARQUIVADOS'
  | 'ATRASO_CRITICO';

export type AccessLevel = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface PaymentModalState {
  loan: Loan;
  inst: Installment;
  calculations: {
    total: number;
    interestHandling?: any; // TODO: Define a proper type for interestHandling
  };
}

export interface UIController {
  paymentModal: PaymentModalState | null;
  paymentType: PaymentType;
  avAmount: string;
  setIsProcessingPayment: (isProcessing: boolean) => void;
  closeModal: () => void;
  setAvAmount: (amount: string) => void;
  setShowReceipt: (receipt: any) => void; // TODO: Define Receipt type
  openModal: (modalName: string) => void;
}

export interface ProfileUIController {
  resetPasswordInput: string;
  deleteAccountAgree: boolean;
  deleteAccountConfirm: string;
  closeModal: () => void;
}

export interface SourceUIController {
  sourceForm: {
    name: string;
    type: CapitalSource["type"];
    balance: string;
    operador_permitido_id?: string;
  };
  isSaving: boolean;
  activeModal: {
    payload?: CapitalSource;
  } | null;
  addFundsValue: string | null;
  editingSource: CapitalSource | null;
  withdrawValue: string | null;
  withdrawSourceId: string | null;
  closeModal: () => void;
  setIsSaving: (isSaving: boolean) => void;
  setEditingSource: (source: CapitalSource | null) => void;
}

export type AmortizationType = 'JUROS' | 'PRICE' | 'SAC';

export interface Sheet {
  name: string;
  headers: string[];
  rows: any[][];
}

export interface ImportCandidate {
  nome: string;
  documento: string;
  whatsapp: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  valor_base: number;
  data_referencia?: string;
  notas?: string;
  status: 'OK' | 'AVISO' | 'ERRO';
  mensagens: string[];
  original_row: any;
}

export type PaymentType = 'FULL' | 'RENEW_INTEREST' | 'RENEW_AV' | 'LEND_MORE' | 'CUSTOM' | 'PARTIAL_INTEREST';

export type EventStatus =
  | 'PENDING'
  | 'DONE'
  | 'LATE'
  | 'PAID'
  | 'PARTIAL'
  | 'OVERDUE'
  | 'DUE_TODAY'
  | 'DUE_SOON'
  | 'UPCOMING';