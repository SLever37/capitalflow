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

export type CapitalSource = 'PROPRIO' | 'TERCEIROS' | 'MISTO';

export type SortOption = 'RECENT' | 'NAME' | 'VALUE' | 'STATUS';

export type AppTab = 'DASHBOARD' | 'CLIENTS' | 'LEGAL' | 'SOURCES' | 'PROFILE';

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
  installments: AgreementInstallment[];
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
  installments?: number;
  city?: string;
  witnesses?: LegalWitness[];
  contractDate?: string;
}

export interface LegalDocumentRecord {
  id: string;
  loanId: string;
  created_at: string;
  public_access_token?: string;
  hashSHA256?: string;
  agreementId?: string;
}

/* =====================================================
   CALENDAR
===================================================== */

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