
import { Loan, LoanBillingModality, PaymentMethod, LoanDocument } from '../../../types';
import { generateUUID } from '../../../utils/generators';
import { modalityRegistry } from '../../../domain/finance/modalities/registry';

export interface LoanFormState {
  clientId: string;
  debtorName: string;
  debtorPhone: string;
  debtorDocument: string;
  debtorAddress: string;
  sourceId: string;
  preferredPaymentMethod: PaymentMethod;
  pixKey: string;
  principal: string;
  interestRate: string;
  finePercent: string; 
  dailyInterestPercent: string;
  billingCycle: LoanBillingModality;
  notes: string;
  guaranteeDescription: string;
  startDate: string;
  skipWeekends?: boolean;
  // Campos de Funding
  fundingTotalPayable?: string;
  fundingProvider?: string;
  fundingFeePercent?: string;
}

export const mapFormToLoan = (
  form: LoanFormState,
  fixedDuration: string,
  initialData: Loan | null,
  attachments: string[],
  documentPhotos: string[],
  customDocuments: LoanDocument[]
): Loan => {
  
  const principal = parseFloat(form.principal);
  const rate = parseFloat(form.interestRate);
  
  // Cálculo do Custo de Captação (Cartão)
  let fundingTotalPayable = 0;
  let fundingCost = 0;
  
  if (form.fundingTotalPayable) {
      fundingTotalPayable = parseFloat(form.fundingTotalPayable);
      if (!isNaN(fundingTotalPayable) && fundingTotalPayable > principal) {
          fundingCost = fundingTotalPayable - principal;
      }
  }
  
  // --- GERAÇÃO VIA REGISTRY ---
  const strategy = modalityRegistry.get(form.billingCycle);
  
  const { installments, totalToReceive } = strategy.generateInstallments({
      principal,
      rate,
      startDate: form.startDate,
      fixedDuration,
      initialData: {
          ...initialData,
          skipWeekends: form.skipWeekends
      }
  });

  return {
    id: initialData?.id || generateUUID(),
    clientId: form.clientId, 
    debtorName: form.debtorName,
    debtorPhone: form.debtorPhone,
    debtorDocument: form.debtorDocument,
    debtorAddress: form.debtorAddress,
    sourceId: form.sourceId, 
    preferredPaymentMethod: form.preferredPaymentMethod,
    pixKey: form.pixKey,
    principal,
    interestRate: rate,
    finePercent: parseFloat(form.finePercent) || 0,
    dailyInterestPercent: parseFloat(form.dailyInterestPercent) || 0,
    
    // Mapeamento de Funding
    fundingTotalPayable: fundingTotalPayable || undefined,
    fundingCost: fundingCost || undefined,
    fundingProvider: form.fundingProvider || undefined,
    fundingFeePercent: parseFloat(form.fundingFeePercent || '') || undefined,

    billingCycle: form.billingCycle,
    amortizationType: 'JUROS', 
    policiesSnapshot: { 
        interestRate: rate, 
        finePercent: parseFloat(form.finePercent) || 0, 
        dailyInterestPercent: parseFloat(form.dailyInterestPercent) || 0 
    },
    startDate: form.startDate, 
    installments,
    totalToReceive,
    ledger: initialData?.ledger || [],
    paymentSignals: initialData?.paymentSignals || [],
    notes: form.notes,
    guaranteeDescription: form.guaranteeDescription,
    attachments,
    documentPhotos,
    customDocuments,
    isArchived: initialData?.isArchived || false,
    skipWeekends: form.skipWeekends
  };
};
