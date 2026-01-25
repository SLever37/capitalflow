
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
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'PAYMENT_FULL' | 'PAYMENT_PARTIAL' | 'PAYMENT_INTEREST_ONLY' | 'LEND_MORE' | 'WITHDRAW_PROFIT' | 'ADJUSTMENT' | 'ARCHIVE' | 'RESTORE' | 'REFUND_SOURCE_CHANGE';
  category?: 'RECEITA' | 'INVESTIMENTO' | 'RECUPERACAO' | 'ESTORNO' | 'GERAL' | 'AUDIT';
  amount: number;
  principalDelta: number;
  interestDelta: number;
  lateFeeDelta: number;
  sourceId?: string; 
  installmentId?: string;
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
  
  renewalCount?: number; // Contador de renovações/pagamentos de juros
  number?: number; // Número da parcela (1, 2, 3...)
}

export interface LoanPolicy {
  interestRate: number;
  finePercent: number;
  dailyInterestPercent: number;
}

export interface PaymentSignal {
  id?: string;
  date: string;
  type: 'INTEREST' | 'AMORTIZATION' | 'FULL' | string;
  receiptBase64?: string;
  comprovanteUrl?: string;
  status: 'PENDING' | 'REVIEWED' | 'PENDENTE' | 'APROVADO' | 'NEGADO' | string;
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

export interface Loan {
  id: string;
  clientId: string;
  debtorName: string;
  debtorPhone: string;
  debtorDocument: string;
  debtorAddress?: string;
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
}

export interface UserProfile {
  id: string;
  name: string;
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
}
