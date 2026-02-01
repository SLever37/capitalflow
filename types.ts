
export enum LoanStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  LATE = 'LATE',
  PARTIAL = 'PARTIAL'
}

export type PaymentMethod = 'PIX' | 'CASH' | 'BANK_TRANSFER' | 'OTHER';
export type SortOption = 'DUE_DATE_ASC' | 'NAME_ASC' | 'CREATED_DESC' | 'UPDATED_DESC';

// Added LoanBillingModality to fix "no exported member" errors
export type LoanBillingModality = 'MONTHLY' | 'DAILY_FREE' | 'DAILY_FIXED_TERM' | 'DAILY' | 'DAILY_30_INTEREST' | 'DAILY_30_CAPITAL' | 'DAILY_FIXED';

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
  fotoUrl?: string;
}

export interface LegalWitness {
  id?: string;
  profile_id?: string;
  name: string;
  document: string;
}

export interface LegalDocumentParams {
  loanId: string;
  creditorName: string;
  creditorDoc: string;
  creditorAddress: string;
  debtorName: string;
  debtorDoc: string;
  debtorAddress: string;
  // Added missing properties to fix confissaoVM.ts and legalService.ts errors
  debtorPhone: string;
  amount: number;
  totalDebt: number;
  originDescription: string;
  city: string;
  state: string;
  witnesses: LegalWitness[];
  contractDate: string;
  agreementDate?: string;
  installments: any[];
  timestamp?: string;
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
  defaultInterestRate?: number;
  defaultFinePercent?: number;
  defaultDailyInterestPercent?: number;
  targetCapital?: number;
  targetProfit?: number;
  password?: string;
  // Added missing properties to fix useAppState.ts and operatorProfileService.ts errors
  recoveryPhrase?: string;
  totalAvailableCapital?: number;
  logoUrl?: string;
  createdAt?: string;
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
  // Added missing properties to fix various ledger and demo service errors
  paidPrincipal: number;
  paidInterest: number;
  paidLateFee: number;
  avApplied: number;
  paidDate?: string;
  renewalCount?: number;
  number?: number;
  paidAmount?: number;
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

// Added LoanPolicy to fix domain/finance/calculations.ts error
export interface LoanPolicy {
  interestRate: number;
  finePercent: number;
  dailyInterestPercent: number;
}

// Added LoanDocument to fix useLoanForm.ts error
export interface LoanDocument {
  id: string;
  url: string;
  name: string;
  type: 'PDF' | 'IMAGE';
  visibleToClient: boolean;
  uploadedAt: string;
}

// Added Agreement and related types to fix various components/services errors
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
  frequency: string;
  startDate: string;
  status: AgreementStatus;
  createdAt: string;
  installments: AgreementInstallment[];
}

// Added LegalSignatureMetadata and LegalDocumentRecord to fix legalService.ts and LegalDocumentModal.tsx errors
export interface LegalSignatureMetadata {
  ip: string;
  user_agent: string;
  signed_at: string;
  method: string;
  lei_base: string;
  signer_name: string;
  signer_doc: string;
}

export interface LegalDocumentRecord {
  id: string;
  agreementId: string;
  type: string;
  snapshot: LegalDocumentParams;
  hashSHA256: string;
  status: 'PENDING' | 'SIGNED';
  signatureMetadata?: LegalSignatureMetadata;
  createdAt: string;
  // Added missing property to fix legalService.ts errors
  public_access_token?: string;
}

export interface Loan {
  id: string;
  clientId: string;
  profile_id: string;
  debtorName: string;
  debtorPhone: string;
  debtorDocument: string;
  debtorAddress?: string;
  sourceId: string;
  preferredPaymentMethod: PaymentMethod;
  principal: number;
  interestRate: number;
  finePercent: number;
  dailyInterestPercent: number;
  // Updated to use LoanBillingModality enum-like type
  billingCycle: LoanBillingModality;
  startDate: string;
  installments: Installment[];
  totalToReceive: number;
  ledger: LedgerEntry[];
  notes: string;
  isArchived?: boolean;
  skipWeekends?: boolean;
  // Changed from any to Agreement
  activeAgreement?: Agreement;
  clientAvatarUrl?: string;
  pixKey?: string;
  fundingTotalPayable?: number;
  fundingCost?: number;
  fundingProvider?: string;
  fundingFeePercent?: number;
  // Updated any[] to typed arrays
  customDocuments?: LoanDocument[];
  policiesSnapshot?: LoanPolicy;
  createdAt?: string;
  // Added missing properties to fix various service/hook errors
  updatedAt?: string;
  guaranteeDescription?: string;
  attachments?: string[];
  documentPhotos?: string[];
  paymentSignals?: any[];
  amortizationType?: 'JUROS' | 'PRICE' | 'SAC';
}
