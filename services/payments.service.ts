import { supabase } from '../lib/supabase';
import type { Loan, Installment, UserProfile, CapitalSource } from '../types';
import { todayDateOnlyUTC, getDaysDiff } from '../utils/dateHelpers';
import { generateUUID } from '../utils/generators';

/* =========================
   Helpers
========================= */
const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeUUID = (v: any) => (isUUID(v) ? v : null);

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export const paymentsService = {
  async processPayment(params: {
    loan: Loan;
    inst: Installment;
    calculations: any;
    paymentType: 'FULL' | 'RENEW_INTEREST' | 'RENEW_AV' | 'LEND_MORE' | 'CUSTOM' | 'PARTIAL_INTEREST';
    avAmount: string;
    activeUser: UserProfile;
    sources: CapitalSource[];
    forgivenessMode?: 'NONE' | 'FINE_ONLY' | 'INTEREST_ONLY' | 'BOTH';
    manualDate?: Date | null;
    customAmount?: number;
    realDate?: Date | null;
    interestHandling?: 'CAPITALIZE' | 'KEEP_PENDING';
  }) {
    const {
      loan,
      inst,
      calculations,
      paymentType,
      avAmount,
      activeUser,
      forgivenessMode = 'NONE',
      customAmount,
      realDate,
    } = params;

    // DEMO
    if (activeUser.id === 'DEMO') {
      return { amountToPay: customAmount || Number(calculations?.total) || 0, paymentType };
    }

    const ownerId = safeUUID((activeUser as any).supervisor_id) || safeUUID(activeUser.id);
    if (!ownerId) throw new Error('Perfil inválido. Refaça o login.');

    const idempotencyKey = generateUUID();

    // =========================
    // LEND_MORE mantém RPC própria
    // =========================
    if (paymentType === 'LEND_MORE') {
      const lendAmount = parseFloat(avAmount) || 0;
      if (lendAmount <= 0) throw new Error('Valor do aporte inválido.');

      const { error } = await supabase.rpc('process_lend_more_atomic', {
        p_idempotency_key: idempotencyKey,
        p_loan_id: loan.id,
        p_installment_id: inst.id,
        p_profile_id: ownerId,
        p_operator_id: safeUUID(activeUser.id),
        p_source_id: loan.sourceId,
        p_amount: lendAmount,
        p_notes: `Novo Aporte (+ R$ ${lendAmount.toFixed(2)})`,
        p_new_total_principal: loan.principal + lendAmount,
        p_new_total_to_receive: loan.totalToReceive + lendAmount,
        p_inst_principal_rem: (Number(inst.principalRemaining) || 0) + lendAmount,
        p_inst_scheduled_princ: (Number(inst.scheduledPrincipal) || 0) + lendAmount,
        p_inst_amount: (Number(inst.amount) || 0) + lendAmount,
        p_category: 'INVESTIMENTO',
      });

      if (error) throw new Error('Erro ao processar aporte: ' + error.message);
      return { amountToPay: lendAmount, paymentType };
    }

    // =========================
    // Cálculo de multa (com perdão)
    // =========================
    const daysLate = Math.max(0, getDaysDiff(inst.dueDate));
    const baseForFine = (calculations?.principal || 0) + (calculations?.interest || 0);

    let fineFixed = 0;
    let fineDaily = 0;

    if (daysLate > 0) {
      fineFixed = baseForFine * (loan.finePercent / 100);
      fineDaily = baseForFine * (loan.dailyInterestPercent / 100) * daysLate;
    }

    let finalLateFee = fineFixed + fineDaily;

    if (forgivenessMode === 'FINE_ONLY') finalLateFee -= fineFixed;
    else if (forgivenessMode === 'INTEREST_ONLY') finalLateFee -= fineDaily;
    else if (forgivenessMode === 'BOTH') finalLateFee = 0;

    finalLateFee = Math.round((finalLateFee + Number.EPSILON) * 100) / 100;

    // =========================
    // 1) Determina valor a pagar
    // =========================
    let amountToPay = 0;
    let basePaymentNote = '';

    if (paymentType === 'CUSTOM') {
      amountToPay = customAmount || 0;
      basePaymentNote = `Recebimento de Diária(s)`;
    } else if (paymentType === 'RENEW_AV') {
      amountToPay = parseFloat(avAmount) || 0;
      basePaymentNote = `Amortização de Capital`;
    } else if (paymentType === 'FULL') {
      amountToPay =
        (Number(calculations?.principal) || 0) +
        (Number(calculations?.interest) || 0) +
        finalLateFee;
      basePaymentNote = 'Quitação Total do Contrato';
    } else if (paymentType === 'PARTIAL_INTEREST') {
      amountToPay = parseFloat(avAmount) || 0;
      basePaymentNote = 'Pagamento Parcial (Juros)';
    } else {
      const interestOnly = Number(calculations?.interest) || 0;
      amountToPay = interestOnly + finalLateFee;
      basePaymentNote = 'Pagamento de Juros / Renovação';
    }

    if (amountToPay <= 0) throw new Error('O valor do pagamento deve ser maior que zero.');

    // =========================
    // 2) Nota (opcional)
    // =========================
    const paymentDate = realDate || todayDateOnlyUTC();
    const paymentDateISO = paymentDate.toISOString();
    const formattedDate = paymentDate.toLocaleDateString('pt-BR');

    let finalNote = `${basePaymentNote}. Ref: ${formattedDate}.`;
    if (forgivenessMode !== 'NONE') finalNote += ` [Perdão aplicado]`;

    // =========================
    // 3) RPC CANÔNICA (backend calcula deltas/abatimento)
    //    Regra: paga juros; se zerar e sobrar, excedente vai para principal (pagamento+AV).
    //    Mantemos flag para modalidades de juros (se você quiser branches futuras no SQL).
    // =========================
    const { error } = await supabase.rpc('process_payment_atomic', {
      p_installment_id: inst.id,
      p_amount: amountToPay,
      p_idempotency_key: idempotencyKey,
      p_interest_only: paymentType === 'PARTIAL_INTEREST' || paymentType === 'RENEW_INTEREST',
      p_notes: finalNote,
    });

    if (error) {
      const msg = error.message || '';

      if (
        msg.includes('Pagamento excede o saldo da parcela') ||
        msg.includes('Pagamento duplicado detectado')
      ) {
        throw new Error(msg);
      }

      throw new Error('Falha na persistência: ' + msg);
    }

    // =========================
    // 4) ATUALIZAÇÃO DE SALDOS (LUCRO E CAPITAL)
    //    Garante que o Dashboard reflita os valores imediatamente.
    // =========================
    let profitDelta = 0;
    let principalDelta = 0;

    if (paymentType === 'FULL') {
        profitDelta = (Number(calculations?.interest) || 0) + finalLateFee;
        principalDelta = Number(calculations?.principal) || 0;
    } else if (paymentType === 'RENEW_AV') {
        principalDelta = amountToPay;
    } else if (paymentType === 'PARTIAL_INTEREST' || paymentType === 'RENEW_INTEREST' || paymentType === 'CUSTOM') {
        profitDelta = amountToPay;
    }

    if (profitDelta > 0 || principalDelta > 0) {
        const { error: balanceError } = await supabase.rpc('rpc_adjust_balances', {
            p_profile_id: ownerId,
            p_profit_amount: profitDelta,
            p_principal_amount: principalDelta
        });

        if (balanceError) {
            console.error('[PAYMENT] Erro ao atualizar saldos:', balanceError);
            // Não interrompe o fluxo principal, pois o pagamento foi registrado
        }
    }

    return { amountToPay, paymentType };
  },
};