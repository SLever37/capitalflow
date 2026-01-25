
import { LoanBillingModality, CapitalSource } from '../../../types';

interface LoanFormData {
  debtorName: string;
  debtorPhone: string;
  principal: string;
  interestRate: string;
  startDate: string;
  sourceId: string;
  billingCycle: LoanBillingModality;
}

export const validateLoanForm = (
  formData: LoanFormData, 
  sources: CapitalSource[], 
  isEditing: boolean
): { isValid: boolean; error?: string } => {
  
  if (!formData.debtorName.trim()) { 
    return { isValid: false, error: "Erro: O nome do devedor é obrigatório." }; 
  }
  
  if (!formData.debtorPhone.trim()) { 
    return { isValid: false, error: "Erro: O telefone do devedor é obrigatório para contato." }; 
  }
  
  const principal = parseFloat(formData.principal);
  if (isNaN(principal) || principal <= 0) { 
    return { isValid: false, error: "Erro: O valor Principal deve ser maior que zero." }; 
  }
  
  const rate = parseFloat(formData.interestRate);
  if(isNaN(rate)) { 
    return { isValid: false, error: "Erro: Informe a Taxa de Juros." }; 
  }

  if (!formData.startDate) { 
    return { isValid: false, error: "Erro: A data do empréstimo é obrigatória." }; 
  }

  if (formData.sourceId) {
      const selectedSource = sources.find(s => s.id === formData.sourceId);
      if (!isEditing && selectedSource && principal > selectedSource.balance) {
          // Warning handled in UI logic usually, but here just validation logic
          // Returning valid here, but we can flag warning. 
          // For strict validation let's keep it clean.
      }
  }

  return { isValid: true };
};
