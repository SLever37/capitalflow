
import { supabase } from '../lib/supabase';
import type { Loan, Installment, UserProfile, CapitalSource } from '../types';
import { todayDateOnlyUTC, getDaysDiff } from '../utils/dateHelpers';
import { generateUUID } from '../utils/generators';
import { loanEngine } from '../domain/loanEngine';

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
    paymentType:
      | 'FULL'
      | 'RENEW_INTEREST'
      | 'RENEW_AV'
      | 'LEND_MORE'
      | 'CUSTOM'
      | 'PARTIAL_INTEREST';
    avAmount: string;
    activeUser: UserProfile;
    sources: CapitalSource[];
    forgivenessMode?: 'NONE' | 'FINE_ONLY' | 'INTEREST_ONLY' | 'BOTH';
    manualDate?: Date | null;
    customAmount?: number;
    realDate?: Date | null;
    capitalizeRemaining?: boolean; // NOVO: Se deve capitalizar juros não pagos
  }) {
    const {
      loan,
      inst,
      calculations,
      paymentType,
      avAmount,
      activeUser,
      sources,
      forgivenessMode = 'NONE',
      customAmount,
      realDate,
      capitalizeRemaining = false
    } = params;

    /* =====================================================
       BLOQUEIO FRONTEND — Parcela já quitada
    ===================================================== */
    if (String(inst.status || '').toUpperCase() === 'PAID') {
      throw new Error('Parcela já quitada');
    }

    if (activeUser.id === 'DEMO') {
      return { amountToPay: customAmount || Number(calculations?.total) || 0, paymentType };
    }

    const ownerId =
      safeUUID(loan.profile_id) ||
      safeUUID((activeUser as any).supervisor_id) ||
      safeUUID(activeUser.id);

    if (!ownerId) throw new Error('Perfil inválido. Refaça o login.');

    const idempotencyKey = generateUUID();

    /* =====================================================
       LEND_MORE (Aporte)
    ===================================================== */
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
      });

      if (error) throw new Error(error.message);
      return { amountToPay: lendAmount, paymentType };
    }

    /* =====================================================
       DEFINIR VALOR A PAGAR
    ===================================================== */
    const parseMoney = (v: string) => {
      if (!v) return 0;
      const clean = v.replace(/[R$\s]/g, '');
      if (clean.includes('.') && clean.includes(',')) {
        return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
      }
      if (clean.includes(',')) return parseFloat(clean.replace(',', '.')) || 0;
      return parseFloat(clean) || 0;
    };

    let amountToPay = 0;
    if (paymentType === 'CUSTOM') {
      amountToPay = customAmount || 0;
    } else if (paymentType === 'RENEW_AV') {
      amountToPay = parseMoney(avAmount);
    } else if (paymentType === 'FULL') {
      const balance = loanEngine.computeRemainingBalance(loan);
      amountToPay = balance.totalRemaining;
    } else if (paymentType === 'PARTIAL_INTEREST') {
      amountToPay = parseMoney(avAmount);
    } else {
      // RENEW_INTEREST
      const balance = loanEngine.computeRemainingBalance(loan);
      amountToPay = balance.interestRemaining + balance.lateFeeRemaining;
    }

    if (amountToPay <= 0) throw new Error('O valor do pagamento deve ser maior que zero.');

    /* =====================================================
       AMORTIZAÇÃO SELETIVA (ENGINE)
    ===================================================== */
    const amortization = loanEngine.calculateAmortization(amountToPay, loan);

    /* =====================================================
       RPC OFICIAL V3 (Amortização + Fluxo de Caixa)
    ===================================================== */
    const paymentDate = realDate || todayDateOnlyUTC();

    // Chamada RPC que lida com a separação de Capital vs Lucro
    const caixaLivre = sources.find(s => s.name.toLowerCase().includes('caixa livre') || s.name.toLowerCase() === 'lucro');
    const caixaLivreId = caixaLivre ? caixaLivre.id : '28646e86-cec9-4d47-b600-3b771a066a05';

    const { error } = await supabase.rpc('process_payment_v3_selective', {
      p_idempotency_key: idempotencyKey,
      p_loan_id: loan.id,
      p_installment_id: inst.id,
      p_profile_id: ownerId,
      p_operator_id: safeUUID(activeUser.id),
      p_principal_paid: amortization.paidPrincipal,
      p_interest_paid: amortization.paidInterest,
      p_late_fee_paid: amortization.paidLateFee,
      p_payment_date: paymentDate.toISOString(),
      p_capitalize_remaining: capitalizeRemaining, // Se sobra juros, capitaliza ou aguarda
      p_source_id: loan.sourceId, // Para devolver o capital à carteira
      p_caixa_livre_id: caixaLivreId // ID fixo ou dinâmico do Caixa Livre para o lucro
    });

    if (error) throw new Error('Falha na persistência: ' + error.message);

    return { amountToPay, paymentType, amortization };
  },
};
