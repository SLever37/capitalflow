// services/payments.service.ts
import { supabase } from '../lib/supabase';
import type { Loan, Installment, UserProfile, CapitalSource } from '../types';
import { todayDateOnlyUTC } from '../utils/dateHelpers';
import { generateUUID } from '../utils/generators';
import { loanEngine } from '../domain/loanEngine';

/* =========================
   Helpers
========================= */
const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeUUID = (v: any) => (isUUID(v) ? v : null);

const parseMoney = (v: string) => {
  if (!v) return 0;
  const clean = String(v).replace(/[R$\s]/g, '');
  // "1.234,56" -> "1234.56"
  if (clean.includes('.') && clean.includes(',')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // "1234,56" -> "1234.56"
  if (clean.includes(',')) return parseFloat(clean.replace(',', '.')) || 0;
  // "1234.56"
  return parseFloat(clean) || 0;
};

function resolveCaixaLivreId(sources: CapitalSource[]): string | null {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  // 1) Preferência por flags se existirem (você pode ter campos extras no tipo)
  const byFlag = (sources as any[]).find(
    (s) => s?.is_caixa_livre === true || s?.isCaixaLivre === true || s?.is_profit_box === true
  );
  if (byFlag?.id && isUUID(byFlag.id)) return byFlag.id;

  // 2) Por nome (normalizado)
  const normalize = (s: string) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const caixaLivre = sources.find((s) => {
    const n = normalize((s as any)?.name);
    // cobre "Caixa Livre", "Caixa-livre", "Lucro", etc.
    return n.includes('caixa livre') || n === 'lucro' || n.includes('lucro');
  });

  if (caixaLivre?.id && isUUID(caixaLivre.id)) return caixaLivre.id;

  return null;
}

/**
 * Garante uma fonte "Caixa Livre" válida para receber JUROS/MULTAS.
 * Se não existir no estado atual, tenta buscar no banco; se ainda não existir, cria.
 */
async function ensureCaixaLivreId(ownerId: string, sources: CapitalSource[]): Promise<string> {
  // 1) estado atual
  const mem = resolveCaixaLivreId(sources);
  if (mem) return mem;

  // 2) banco (sem depender de created_at)
  const { data: rows, error: findErr } = await supabase
    .from('fontes')
    .select('id,name')
    .eq('profile_id', ownerId)
    .limit(100);

  if (!findErr && Array.isArray(rows) && rows.length) {
    const normalize = (s: string) =>
      String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const hit = (rows as any[]).find((r) => {
      const n = normalize(r?.name);
      return n.includes('caixa livre') || n === 'lucro' || n.includes('lucro');
    });

    const hitId = safeUUID(hit?.id);
    if (hitId) return hitId;
  }

  // 3) cria automaticamente
  const newId = generateUUID();
  const { error: insErr } = await supabase.from('fontes').insert([
    {
      id: newId,
      profile_id: ownerId,
      name: 'Caixa Livre',
      type: 'CAIXA',
      balance: 0,
    } as any,
  ]);

  if (insErr) {
    throw new Error('Não foi possível criar a fonte Caixa Livre automaticamente: ' + insErr.message);
  }

  return newId;
}

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
    capitalizeRemaining?: boolean;
  }) {
    const {
      loan,
      inst,
      calculations,
      paymentType,
      avAmount,
      activeUser,
      sources,
      customAmount,
      realDate,
      capitalizeRemaining = false,
    } = params;

    /* =====================================================
       BLOQUEIO FRONTEND — Parcela já quitada
    ===================================================== */
    if (String((inst as any)?.status || '').toUpperCase() === 'PAID') {
      throw new Error('Parcela já quitada');
    }

    if (!activeUser?.id) {
      throw new Error('Usuário não autenticado. Refaça o login.');
    }

    if (activeUser.id === 'DEMO') {
      return { amountToPay: customAmount || Number(calculations?.total) || 0, paymentType };
    }

    const ownerId =
      safeUUID((loan as any).profile_id) ||
      safeUUID((activeUser as any).supervisor_id) ||
      safeUUID(activeUser.id);

    if (!ownerId) throw new Error('Perfil inválido. Refaça o login.');

    const idempotencyKey = generateUUID();

    /* =====================================================
       LEND_MORE (Aporte)
    ===================================================== */
    if (paymentType === 'LEND_MORE') {
      const lendAmount = parseMoney(avAmount);
      if (lendAmount <= 0) throw new Error('Valor do aporte inválido.');

      const sourceId = safeUUID((loan as any).sourceId);
      if (!sourceId) throw new Error('Fonte do contrato inválida (sourceId).');

      const { error } = await supabase.rpc('process_lend_more_atomic', {
        p_idempotency_key: idempotencyKey,
        p_loan_id: loan.id,
        p_installment_id: inst.id,
        p_profile_id: ownerId,
        p_operator_id: safeUUID(activeUser.id),
        p_source_id: sourceId,
        p_amount: lendAmount,
        p_notes: `Novo Aporte (+ R$ ${lendAmount.toFixed(2)})`,
      });

      if (error) throw new Error(error.message);
      return { amountToPay: lendAmount, paymentType };
    }

    /* =====================================================
       DEFINIR VALOR A PAGAR
    ===================================================== */
    let amountToPay = 0;

    if (paymentType === 'CUSTOM') {
      amountToPay = Number(customAmount || 0);
    } else if (paymentType === 'RENEW_AV') {
      amountToPay = parseMoney(avAmount);
    } else if (paymentType === 'FULL') {
      const balance = loanEngine.computeRemainingBalance(loan);
      amountToPay = Number(balance.totalRemaining || 0);
    } else if (paymentType === 'PARTIAL_INTEREST') {
      amountToPay = parseMoney(avAmount);
    } else {
      // RENEW_INTEREST
      const balance = loanEngine.computeRemainingBalance(loan);
      amountToPay = Number((balance.interestRemaining || 0) + (balance.lateFeeRemaining || 0));
    }

    // Hardening: evita "0" por parse/float/strings vazias
    if (!Number.isFinite(amountToPay)) amountToPay = 0;
    if (amountToPay <= 0) throw new Error('O valor do pagamento deve ser maior que zero.');

    /* =====================================================
       AMORTIZAÇÃO SELETIVA (ENGINE)
    ===================================================== */
    const amortization = loanEngine.calculateAmortization(amountToPay, loan);

    // Hardening final: evita RPC com tudo zerado
    const principalPaid = Number(amortization.paidPrincipal || 0);
    const interestPaid = Number(amortization.paidInterest || 0);
    const lateFeePaid = Number(amortization.paidLateFee || 0);
    const totalPaid = principalPaid + interestPaid + lateFeePaid;

    if (totalPaid <= 0) {
      throw new Error('O valor do pagamento deve ser maior que zero.');
    }

    /* =====================================================
       RPC OFICIAL V3 (Amortização + Fluxo de Caixa)
    ===================================================== */
    const paymentDate = realDate || todayDateOnlyUTC();

    const sourceId = safeUUID((loan as any).sourceId);
    if (!sourceId) throw new Error('Fonte do contrato inválida (sourceId).');

    const caixaLivreId = await ensureCaixaLivreId(ownerId, sources);

    const { error } = await supabase.rpc('process_payment_v3_selective', {
      p_idempotency_key: idempotencyKey,
      p_loan_id: loan.id,
      p_installment_id: inst.id,
      p_profile_id: ownerId,
      p_operator_id: safeUUID(activeUser.id),
      p_principal_paid: principalPaid,
      p_interest_paid: interestPaid,
      p_late_fee_paid: lateFeePaid,
      // IMPORTANTÍSSIMO: timestamptz em ISO (não date-only)
      p_payment_date: paymentDate.toISOString(),
      p_capitalize_remaining: !!capitalizeRemaining,
      p_source_id: sourceId,
      p_caixa_livre_id: caixaLivreId,
    });

    if (error) throw new Error('Falha na persistência: ' + error.message);

    return { amountToPay, paymentType, amortization };
  },
};