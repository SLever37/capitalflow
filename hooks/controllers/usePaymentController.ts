// controllers/usePaymentController.ts
import React, { useRef } from 'react';
import { paymentsService } from '../../services/payments.service';
import { demoService } from '../../services/demo.service';
import { UserProfile, Loan, CapitalSource, UIController, PaymentType } from '../../types';

const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeUUID = (v: any) => (isUUID(v) ? v : null);

// ✅ NOVO: evita spinner infinito quando RPC ou refresh ficam pendurados
const withTimeout = async <T,>(p: Promise<T>, ms: number, label: string): Promise<T> => {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: tempo excedido (${ms}ms)`)), ms)
    ),
  ]);
};

export const usePaymentController = (
  activeUser: UserProfile | null,
  ui: UIController,
  sources: CapitalSource[],
  loans: Loan[],
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>,
  setActiveUser: React.Dispatch<React.SetStateAction<UserProfile | null>>,
  fetchFullData: (id: string) => Promise<void>,
  showToast: (msg: string, type?: 'success' | 'error') => void
) => {
  const inFlightRef = useRef(false);
  const lastSigRef = useRef<{ sig: string; ts: number } | null>(null);
  const DOUBLE_CLICK_THRESHOLD = 2000; // 2 segundos

  const handlePayment = async (
    forgivenessMode?: 'NONE' | 'FINE_ONLY' | 'INTEREST_ONLY' | 'BOTH',
    manualDate?: Date | null,
    customAmount?: number,
    realDate?: Date | null,
    interestHandling?: 'CAPITALIZE' | 'KEEP_PENDING',
    paymentTypeOverride?: string,
    avAmountOverride?: string
  ) => {
    if (!activeUser || !ui.paymentModal) return;

    const ownerId = safeUUID(activeUser.supervisor_id) || safeUUID(activeUser.id);
    if (!ownerId) {
      showToast('Perfil inválido. Refaça o login.', 'error');
      return;
    }

    if (inFlightRef.current) return;

    const loanId = ui.paymentModal?.loan?.id || '';
    const instId = ui.paymentModal?.inst?.id || '';
    const type = paymentTypeOverride || ui.paymentType || '';
    const amountRaw =
      type === 'CUSTOM' ? String(customAmount ?? '') : String(avAmountOverride || ui.avAmount || '');

    // Verificar se parcela já está PAID
    if (ui.paymentModal?.inst?.status === 'PAID') {
      showToast('Esta parcela já foi quitada.', 'error');
      return;
    }

    // Assinatura para evitar duplo clique
    const sig = `${ownerId}|${loanId}|${instId}|${type}|${amountRaw}|${String(forgivenessMode)}|${
      manualDate ? manualDate.toISOString() : ''
    }`;

    const now = Date.now();
    const last = lastSigRef.current;
    if (last && last.sig === sig && now - last.ts < DOUBLE_CLICK_THRESHOLD) {
      showToast('Aguarde o processamento anterior...', 'error');
      return;
    }

    lastSigRef.current = { sig, ts: now };
    inFlightRef.current = true;
    ui.setIsProcessingPayment(true);

    if (activeUser.id === 'DEMO') {
      demoService.handlePayment({
        loan: ui.paymentModal.loan,
        inst: ui.paymentModal.inst,
        amountToPay: customAmount || ui.paymentModal.calculations.total,
        paymentType: type as PaymentType,
        activeUser,
        loans,
        setLoans,
        setActiveUser,
        showToast,
        forgivePenalty: forgivenessMode === 'BOTH',
      });

      ui.closeModal();
      ui.setAvAmount('');
      ui.setShowReceipt({
        loan: ui.paymentModal.loan,
        inst: ui.paymentModal.inst,
        amountPaid: 0,
        type: type,
      });

      ui.setIsProcessingPayment(false);
      inFlightRef.current = false;
      return;
    }

    try {
      const { amountToPay, paymentType: typeReturned } = await withTimeout(
        paymentsService.processPayment({
          loan: ui.paymentModal.loan,
          inst: ui.paymentModal.inst,
          calculations: ui.paymentModal.calculations,
          paymentType: type as PaymentType,
          avAmount: avAmountOverride || ui.avAmount,
          activeUser: { ...activeUser, id: ownerId } as UserProfile,
          sources,
          forgivenessMode,
          manualDate, // Data do próximo vencimento
          customAmount,
          realDate, // Data real do pagamento (EXTRATO)
          capitalizeRemaining: interestHandling === 'CAPITALIZE',
        }),
        20000,
        'Pagamento (RPC)'
      );

      let msg = '';
      if (typeReturned === 'LEND_MORE') msg = 'Novo aporte realizado com sucesso!';
      else if (typeReturned === 'FULL') msg = 'Quitado com sucesso!';
      else msg = 'Renovado com sucesso!';

      showToast(msg, 'success');

      ui.closeModal();
      ui.setAvAmount('');

      if (typeReturned !== 'LEND_MORE') {
        ui.setShowReceipt({
          loan: ui.paymentModal.loan,
          inst: ui.paymentModal.inst,
          amountPaid: amountToPay,
          type: typeReturned,
        });
        ui.openModal('RECEIPT');
      }

      // ✅ também com timeout, para não travar o spinner
      await withTimeout(fetchFullData(ownerId), 20000, 'Atualização pós-pagamento');
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || 'Erro ao processar ação.', 'error');
    } finally {
      ui.setIsProcessingPayment(false);
      inFlightRef.current = false;
    }
  };

  return { handlePayment };
};