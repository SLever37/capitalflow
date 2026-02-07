import { useRef } from 'react';
import { paymentsService } from '../../services/payments.service';
import { demoService } from '../../services/demo.service';
import { UserProfile, Loan, CapitalSource } from '../../types';

/* =========================
   Helpers
========================= */
const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeUUID = (v: any) => (isUUID(v) ? v : null);

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
  // ✅ Trava imediata (não depende do setState)
  const inFlightRef = useRef(false);

  // ✅ Anti-duplo-clique por assinatura + janela curta
  const lastSigRef = useRef<{ sig: string; ts: number } | null>(null);

  const handlePayment = async (forgivePenalty?: boolean, manualDate?: Date | null, customAmount?: number) => {
    if (!activeUser || !ui.paymentModal) return;

    // ✅ ownerId padronizado (supervisor ou o próprio)
    const ownerId =
      safeUUID((activeUser as any).supervisor_id) ||
      safeUUID(activeUser.id);

    if (!ownerId) {
      showToast('Perfil inválido. Refaça o login.', 'error');
      return;
    }

    // ✅ trava instantânea (antes do React atualizar ui.isProcessingPayment)
    if (inFlightRef.current) return;

    // ✅ assinatura do pagamento para bloquear repetição imediata
    const loanId = ui.paymentModal?.loan?.id || '';
    const instId = ui.paymentModal?.inst?.id || '';
    const type = ui.paymentType || '';
    const amountRaw =
      type === 'CUSTOM'
        ? String(customAmount ?? '')
        : String(ui.avAmount ?? '');

    const sig = `${ownerId}|${loanId}|${instId}|${type}|${amountRaw}|${String(!!forgivePenalty)}|${manualDate ? manualDate.toISOString() : ''}`;

    const now = Date.now();
    const last = lastSigRef.current;
    if (last && last.sig === sig && now - last.ts < 2000) {
      // Ignora clique duplicado em janela curta
      return;
    }
    lastSigRef.current = { sig, ts: now };

    // ✅ trava
    inFlightRef.current = true;
    ui.setIsProcessingPayment(true);

    // Demo Logic
    if (activeUser.id === 'DEMO') {
      demoService.handlePayment({
        loan: ui.paymentModal.loan,
        inst: ui.paymentModal.inst,
        amountToPay: customAmount || ui.paymentModal.calculations.total,
        paymentType: ui.paymentType,
        activeUser,
        loans,
        setLoans,
        setActiveUser,
        showToast,
        forgivePenalty
      });

      ui.closeModal();
      ui.setAvAmount('');
      ui.setShowReceipt({ loan: ui.paymentModal.loan, inst: ui.paymentModal.inst, amountPaid: 0, type: ui.paymentType });
      ui.setIsProcessingPayment(false);
      inFlightRef.current = false;
      return;
    }

    try {
      const { amountToPay, paymentType: typeReturned } = await paymentsService.processPayment({
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

      let msg = '';
      if (typeReturned === 'LEND_MORE') msg = 'Novo aporte realizado com sucesso!';
      else if (typeReturned === 'FULL') msg = 'Quitado com sucesso!';
      else msg = 'Renovado com sucesso!';

      showToast(msg, 'success');

      ui.closeModal();
      ui.setAvAmount('');

      if (typeReturned !== 'LEND_MORE') {
        ui.setShowReceipt({ loan: ui.paymentModal.loan, inst: ui.paymentModal.inst, amountPaid: amountToPay, type: typeReturned });
        ui.openModal('RECEIPT');
      }

      // ✅ recarrega pelo ownerId (não pelo operador)
      await fetchFullData(ownerId);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Erro ao processar ação.', 'error');
    } finally {
      ui.setIsProcessingPayment(false);
      inFlightRef.current = false;
    }
  };

  return {
    handlePayment
  };
};