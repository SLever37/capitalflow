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

export type SortOption =
  | 'DUE_DATE_ASC'
  | 'NAME_ASC'
  | 'CREATED_DESC'
  | 'UPDATED_DESC';

export type LoanBillingModality =
  | 'MONTHLY'
  | 'DAILY_FREE'
  | 'DAILY_FIXED_TERM'
  | 'DAILY'
  | 'DAILY_30_INTEREST'
  | 'DAILY_30_CAPITAL'
  | 'DAILY_FIXED';

export type AppTab =
  | 'DASHBOARD'
  | 'CLIENTS'
  | 'TEAM'
  | 'SOURCES'
  | 'PROFILE'
  | 'LEGAL'
  | 'PERSONAL_FINANCE'
  | 'SETTINGS'
  | 'LEADS'
  | 'ACQUISITION';

export interface Lead {
  id: string;
  created_at: string;
  valor_solicitado: number;
  whatsapp: string;
  nome?: string;
  status: 'NOVO' | 'EM_ATENDIMENTO' | 'CONVERTIDO' | 'REJEITADO';
  origem?: string;
  utm_source?: string;
  utm_campaign?: string;
  owner_id?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  source: string;
  link: string;
  createdAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  values: number[];
  messageTemplate: string;
  imageUrl?: string;
  clicks: number;
  leads: number;
}

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

export interface LoanPolicy {
  interestRate: number;
  finePercent: number;
  dailyInterestPercent: number;
}

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

export type AgreementStatus = 'ACTIVE' | 'PAID' | 'BROKEN';

export interface Agreement {
  id: string;
  loanId: string;
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

export interface LoanDocument {
  id: string;
  url: string;
  name: string;
  type: 'IMAGE' | 'PDF';
  visibleToClient: boolean;
  uploadedAt: string;
}

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

  // 🔥 ADICIONADO — ESSENCIAL PARA COMPILAR
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