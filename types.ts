
export enum LoanStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  LATE = 'LATE',
  PARTIAL = 'PARTIAL'
}

export type PaymentMethod = 'PIX' | 'CASH' | 'BANK_TRANSFER' | 'OTHER';
export type SortOption = 'DUE_DATE_ASC' | 'NAME_ASC' | 'CREATED_DESC' | 'UPDATED_DESC';
export type LoanBillingModality = 'MONTHLY' | 'DAILY_FREE' | 'DAILY_FIXED_TERM' | 'DAILY' | 'DAILY_30_INTEREST' | 'DAILY_30_CAPITAL' | 'DAILY_FIXED';

export type AppTab = 'DASHBOARD' | 'CLIENTS' | 'TEAM' | 'SOURCES' | 'PROFILE' | 'MASTER' | 'LEGAL' | 'PERSONAL_FINANCE';

// Added missing Client interface to fix "no exported member" errors
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

export interface CapitalSource {
  id: string;
  name: string;
  type: 'CASH' | 'CARD' | 'WALLET' | 'BANK';
  balance: number;
  operador_permitido_id?: string;
}

export interface LoanDocument {
  id: string;
  url: string;
  name: string;
  type: 'IMAGE' | 'PDF';
  visibleToClient: boolean;
  uploadedAt: string;
}

export interface LoanPolicy {
  interestRate: number;
  finePercent: number;
  dailyInterestPercent: number;
}

// Added missing Agreement types and interfaces to fix "no exported member" errors
export type AgreementStatus = 'ACTIVE' | 'PAID' | 'BROKEN';
export type AgreementType = 'PARCELADO_COM_JUROS' | 'PARCELADO_SEM_JUROS';

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
  type: AgreementType;
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

/**
 * Added LegalWitness to fix exported member errors
 */
export interface LegalWitness {
    id?: string;
    profile_id?: string;
    name: string;
    document: string;
}

/**
 * Added LegalDocumentParams to fix exported member errors
 */
export interface LegalDocumentParams {
    loanId: string;
    creditorName: string;
    creditorDoc: string;
    creditorAddress: string;
    debtorName: string;
    debtorDoc: string;
    debtorPhone: string;
    debtorAddress: string;
    amount: number;
    totalDebt: number;
    originDescription: string;
    city: string;
    state: string;
    witnesses: LegalWitness[];
    contractDate: string;
    agreementDate: string;
    installments: { number: number; dueDate: string; amount: number }[];
    timestamp: string;
}

/**
 * Added LegalDocumentRecord to fix exported member errors
 */
export interface LegalDocumentRecord {
    id: string;
    agreementId: string;
    type: string;
    snapshot: LegalDocumentParams;
    hashSHA256: string;
    status: 'SIGNED' | 'PENDING';
    public_access_token: string;
    createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  fullName?: string;
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
  pixKey?: string;
  photo?: string;
  interestBalance: number;
  accessLevel: number;
  brandColor?: string;
  logoUrl?: string;
  targetCapital?: number;
  targetProfit?: number;
  password?: string;
  recoveryPhrase?: string;
  supervisor_id?: string;
  defaultInterestRate?: number;
  defaultFinePercent?: number;
  defaultDailyInterestPercent?: number;
  // Added missing totalAvailableCapital to fix operatorProfileService.ts error
  totalAvailableCapital?: number;
  /**
   * Added createdAt to fix mapping error in operatorProfileService.ts
   */
  createdAt?: string;
  // Configurações de UI
  ui_nav_order?: AppTab[];
  ui_hub_order?: AppTab[];
}

export interface Loan {
  id: string;
  clientId: string;
  profile_id: string;
  operador_responsavel_id?: string;
  debtorName: string;
  debtorPhone: string;
  debtorDocument: string;
  // Added missing debtorAddress, pixKey, guaranteeDescription to fix useLoanForm.ts and dbAdapters.ts errors
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
  isArchived?: boolean;
  skipWeekends?: boolean;
  clientAvatarUrl?: string;
  // Updated activeAgreement type from any to Agreement to fix typing errors
  activeAgreement?: Agreement;
  paymentSignals?: any[];
  customDocuments?: LoanDocument[];
  createdAt?: string;
  // Added missing fields for Loan consistency across the app
  attachments?: string[];
  documentPhotos?: string[];
  policiesSnapshot?: LoanPolicy | null;
  amortizationType?: 'JUROS' | 'PRICE' | 'SAC';
  fundingTotalPayable?: number;
  fundingCost?: number;
  fundingProvider?: string;
  fundingFeePercent?: number;
  updatedAt?: string;
  portalToken?: string;
}

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
  // Added missing avApplied, paidAmount, number, and logs to fix multiple calculation errors
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
  // Added missing agreementId for consistency in ledger records
  agreementId?: string;
  notes?: string;
  category?: string;
}
