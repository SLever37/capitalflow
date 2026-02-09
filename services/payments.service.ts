
import { supabase } from '../lib/supabase';
import type { Loan, Installment, UserProfile, CapitalSource } from '../types';
import { allocatePayment } from '../domain/finance/calculations';
import { todayDateOnlyUTC } from '../utils/dateHelpers';
import { financeDispatcher } from '../domain/finance/dispatch';
import { generateUUID } from '../utils/generators';

/* =========================
   Helpers
========================= */
const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeUUID = (v: any) => (isUUID(v) ? v : null);

export const paymentsService = {
  async processPayment(params: {
    loan: Loan;
    inst: Installment;
    calculations: any;
    paymentType: 'FULL' | 'RENEW_INTEREST' | 'RENEW_AV' | 'LEND_MORE' | 'CUSTOM';
    avAmount: string;
    activeUser: UserProfile;
    sources: CapitalSource[];
    forgivePenalty?: boolean;
    manualDate?: Date | null;
    customAmount?: number;
  }) {
    const {
      loan,
      inst,
      calculations,
      paymentType,
      avAmount,
      activeUser,
      sources,
      forgivePenalty,
      manualDate,
      customAmount
    } = params;

    // =========================
    // DEMO MODE
    // =========================
    if (activeUser.id === 'DEMO') {
      return { amountToPay: customAmount || Number(calculations?.total) || 0, paymentType };
    }

    // =========================
    // OWNER PADRÃO (CRÍTICO)
    // =========================
    const ownerId =
      safeUUID((activeUser as any).supervisor_id) ||
      safeUUID(activeUser.id);

    if (!ownerId) {
      throw new Error('Perfil inválido. Refaça o login.');
    }

    // =========================
    // IDEMPOTENCY KEY
    // =========================
    // Utilizar UUID válido para garantir compatibilidade com a assinatura da função no banco
    const idempotencyKey = generateUUID();

    // =========================
    // NOVO APORTE (LEND_MORE)
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
        p_category: 'INVESTIMENTO'
      });

      if (error) throw new Error('Erro ao processar aporte: ' + error.message);
      return { amountToPay: lendAmount, paymentType };
    }

    // =========================
    // ALOCAÇÃO DE PAGAMENTO
    // =========================
    let amountToPay = 0;
    let paymentNote = '';
    let allocation: any = null;

    if (paymentType === 'CUSTOM') {
      amountToPay = customAmount || 0;
      allocation = { principalPaid: 0, interestPaid: amountToPay, lateFeePaid: 0, avGenerated: 0 };
      paymentNote = `Recebimento de Diária(s) (R$ ${amountToPay.toFixed(2)})`;

    } else if (paymentType === 'RENEW_AV') {
      amountToPay = parseFloat(avAmount) || 0;
      allocation = { principalPaid: 0, interestPaid: 0, lateFeePaid: 0, avGenerated: amountToPay };
      paymentNote = `Amortização de Capital (R$ ${amountToPay.toFixed(2)})`;

    } else if (paymentType === 'FULL') {
      amountToPay = Number(calculations.total);
      paymentNote = 'Quitação Total do Contrato';
      allocation = allocatePayment(amountToPay, calculations);

    } else {
      const interestOnly = Number(calculations?.interest) || 0;
      const lateFee = Number(calculations?.lateFee) || 0;
      amountToPay = forgivePenalty ? interestOnly : (interestOnly + lateFee);
      paymentNote = 'Pagamento de Juros / Renovação';
      allocation = allocatePayment(
        amountToPay,
        forgivePenalty ? { ...calculations, lateFee: 0 } : calculations
      );
    }

    if (amountToPay <= 0) {
      throw new Error('O valor do pagamento deve ser maior que zero.');
    }

    // =========================
    // CÁLCULOS FINANCEIROS
    // =========================
    const profitGenerated =
      (Number(allocation?.interestPaid) || 0) +
      (Number(allocation?.lateFeePaid) || 0);

    const principalReturned =
      (Number(allocation?.principalPaid) || 0) +
      (Number(allocation?.avGenerated) || 0);

    const renewal = financeDispatcher.renew(
      loan,
      inst,
      amountToPay,
      allocation,
      todayDateOnlyUTC(),
      forgivePenalty || false,
      manualDate
    );

    // =========================
    // PERSISTÊNCIA (RPC ATÔMICA)
    // =========================
    const { error } = await supabase.rpc('process_payment_atomic', {
      p_idempotency_key: idempotencyKey,
      p_loan_id: loan.id,
      p_installment_id: inst.id,
      p_profile_id: ownerId,
      p_operator_id: safeUUID(activeUser.id),
      p_source_id: loan.sourceId,
      p_payment_type: paymentType === 'FULL'
        ? 'PAYMENT_FULL'
        : 'PAYMENT_PARTIAL',
      p_amount_to_pay: amountToPay,
      p_profit_generated: profitGenerated,
      p_principal_returned: principalReturned,
      p_principal_delta: principalReturned,
      p_interest_delta: Number(allocation?.interestPaid) || 0,
      p_late_fee_delta: Number(allocation?.lateFeePaid) || 0,
      p_notes: paymentNote,
      p_new_start_date: renewal.newStartDateISO,
      p_new_due_date: renewal.newDueDateISO,
      p_new_principal_remaining: renewal.newPrincipalRemaining,
      p_new_interest_remaining: renewal.newInterestRemaining,
      p_new_scheduled_principal: renewal.newScheduledPrincipal,
      p_new_scheduled_interest: renewal.newScheduledInterest,
      p_new_amount: renewal.newAmount,
      p_category: 'RECEITA'
    });

    if (error) {
      throw new Error('Falha na persistência de dados: ' + error.message);
    }

    return { amountToPay, paymentType };
  }
};
