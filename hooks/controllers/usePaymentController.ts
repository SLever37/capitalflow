
import { paymentsService } from '../../services/payments.service';
import { demoService } from '../../services/demo.service';
import { UserProfile, Loan, CapitalSource } from '../../types';

export const usePaymentController = (
  activeUser: UserProfile | null,
  ui: any,
  sources: CapitalSource[],
  loans: Loan[],
  setLoans: any,
  setActiveUser: any,
  fetchFullData: (id: string) => Promise<void>,
  showToast: (msg: string, type?: 'success' | 'error') => void
) => {

  const handlePayment = async (forgivePenalty?: boolean, manualDate?: Date | null, customAmount?: number) => {
      if (!activeUser || !ui.paymentModal || ui.isProcessingPayment) return;
      ui.setIsProcessingPayment(true);
      
      // Demo Logic (simplified fallback)
      if (activeUser.id === 'DEMO') {
          demoService.handlePayment({ loan: ui.paymentModal.loan, inst: ui.paymentModal.inst, amountToPay: customAmount || ui.paymentModal.calculations.total, paymentType: ui.paymentType, activeUser, loans, setLoans, setActiveUser, showToast, forgivePenalty });
          ui.closeModal(); ui.setAvAmount(''); ui.setShowReceipt({ loan: ui.paymentModal.loan, inst: ui.paymentModal.inst, amountPaid: 0, type: ui.paymentType }); ui.setIsProcessingPayment(false); return;
      }

      try {
          const { amountToPay, paymentType: type } = await paymentsService.processPayment({ 
              loan: ui.paymentModal.loan, 
              inst: ui.paymentModal.inst, 
              calculations: ui.paymentModal.calculations, 
              paymentType: ui.paymentType, 
              avAmount: ui.avAmount, 
              activeUser, 
              sources, 
              forgivePenalty,
              manualDate,
              customAmount
          });
          
          let msg = "";
          if (type === 'LEND_MORE') msg = "Novo aporte realizado com sucesso!";
          else if (type === 'FULL') msg = "Quitado com sucesso!";
          else msg = "Renovado com sucesso!";
          
          showToast(msg, "success"); 
          
          ui.closeModal(); 
          ui.setAvAmount(''); 
          
          if (type !== 'LEND_MORE') {
            ui.setShowReceipt({ loan: ui.paymentModal.loan, inst: ui.paymentModal.inst, amountPaid: amountToPay, type }); 
            ui.openModal('RECEIPT');
          }
          
          await fetchFullData(activeUser.id);
      } catch (error: any) { console.error(error); showToast(error.message || "Erro ao processar ação.", "error"); } finally { ui.setIsProcessingPayment(false); }
  };

  return {
    handlePayment
  };
};
