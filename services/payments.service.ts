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

const clamp0 = (v: number) => (v < 0 ? 0 : v);

const num = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const normalize = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

function resolveCaixaLivreId(sources: CapitalSource[]): string | null {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  const byFlag = (sources as any[]).find(
    (s) => s?.is_caixa_livre === true || s?.isCaixaLivre === true || s?.is_profit_box === true
  );
  if (byFlag?.id && isUUID(byFlag.id)) return byFlag.id;

  const byName = sources.find((s) => {
    const n = normalize((s as any)?.name);
    return n.includes('caixa livre') || n === 'lucro' || n.includes('lucro');
  });

  if (byName?.id && isUUID(byName.id)) return byName.id;

  return null;
}

async function ensureCaixaLivreId(ownerId: string, sources: CapitalSource[]): Promise<string> {
  const mem = resolveCaixaLivreId(sources);
  if (mem) return mem;

  const { data: rows, error: findErr } = await supabase
    .from('fontes')
    .select('id,name')
    .eq('profile_id', ownerId)
    .limit(200);

  if (!findErr && Array.isArray(rows) && rows.length) {
    const hit = (rows as any[]).find((r) => {
      const n = normalize(r?.name);
      return n.includes('caixa livre') || n === 'lucro' || n.includes('lucro');
    });

    const hitId = safeUUID(hit?.id);
    if (hitId) return hitId;
  }

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

  if (insErr) throw new Error('Não foi possível criar a fonte Caixa Livre automaticamente: ' + insErr.message);

  return newId;
}

const parseMoney = (v: string | number | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;

  let s = String(v).trim();
  if (!s) return 0;

  s = s.replace(/[^\d.,-]/g, '');
  if (!s || s === '-' || s === ',' || s === '.') return 0;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    s = s.replace(',', '.');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

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

    // Parcela já quitada
    if (String((inst as any).status || '').toUpperCase() === 'PAID') {
      throw new Error('Parcela já quitada');
    }

    // Demo
    if (activeUser.id === 'DEMO') {
      const demoValue = num(customAmount) || num(calculations?.total);
      if (demoValue <= 0) throw new Error('O valor do pagamento deve ser maior que zero.');
      return { amountToPay: demoValue, paymentType };
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

      const { error } = await supabase.rpc('process_lend_more_atomic', {
        p_idempotency_key: idempotencyKey,
        p_loan_id: safeUUID(loan.id),
        p_installment_id: safeUUID(inst.id),
        p_profile_id: ownerId,
        p_operator_id: safeUUID(activeUser.id),
        p_source_id: safeUUID((loan as any).sourceId),
        p_amount: lendAmount,
        p_notes: `Novo Aporte (+ R$ ${lendAmount.toFixed(2)})`,
      });

      if (error) throw new Error(error.message);
      return { amountToPay: lendAmount, paymentType };
    }

    /* =====================================================
       DEFINIR VALOR A PAGAR (COM FALLBACK)
    ===================================================== */
    let amountToPay = 0;

    if (paymentType === 'CUSTOM') {
      amountToPay = num(customAmount) || num(calculations?.total);
    } else if (paymentType === 'RENEW_AV') {
      amountToPay = parseMoney(avAmount);
      if (amountToPay <= 0) amountToPay = num(calculations?.total);
    } else if (paymentType === 'PARTIAL_INTEREST') {
      amountToPay = parseMoney(avAmount);
      // NÃO pode cair para total para não amortizar principal sem intenção do operador
      if (amountToPay <= 0) {
        throw new Error('Informe o valor de juros a pagar.');
      }
    } else if (paymentType === 'FULL') {
      const balance = loanEngine.computeRemainingBalance(loan);
      amountToPay = num(balance?.totalRemaining);
      if (amountToPay <= 0) amountToPay = num(calculations?.total);
    } else {
      // RENEW_INTEREST
      const balance = loanEngine.computeRemainingBalance(loan);
      amountToPay = num(balance?.interestRemaining) + num(balance?.lateFeeRemaining);
      if (amountToPay <= 0) amountToPay = num(calculations?.total);
    }

    if (amountToPay <= 0) {
      throw new Error('O valor do pagamento deve ser maior que zero.');
    }

    /* =====================================================
       AMORTIZAÇÃO (HARDENED)
       - garante que principal/juros/multa somem > 0
    ===================================================== */
    const safeCalc = {
      principalRemaining: num((loan as any).principalRemaining ?? (inst as any).principal_remaining ?? (inst as any).principalRemaining),
      interestRemaining: num((loan as any).interestRemaining ?? (inst as any).interest_remaining ?? (inst as any).interestRemaining),
      lateFeeRemaining: num((loan as any).lateFeeRemaining ?? (inst as any).late_fee_accrued ?? (inst as any).lateFeeAccrued),
    };

    let amortization = loanEngine.calculateAmortization(amountToPay, loan) as any;

    const aPrincipal = num(amortization?.paidPrincipal);
    const aInterest = num(amortization?.paidInterest);
    const aLateFee = num(amortization?.paidLateFee);
    const aTotal = aPrincipal + aInterest + aLateFee;

    // Se engine devolver 0/NaN, faz split determinístico aqui
    if (aTotal <= 0) {
      let remaining = amountToPay;

      // regra: sempre paga multa -> juros -> principal
      const payLate = clamp0(Math.min(remaining, safeCalc.lateFeeRemaining));
      remaining -= payLate;

      const payInterest = clamp0(Math.min(remaining, safeCalc.interestRemaining));
      remaining -= payInterest;

      const payPrincipal = clamp0(remaining); // o resto

      amortization = {
        paidPrincipal: payPrincipal,
        paidInterest: payInterest,
        paidLateFee: payLate,
      };

      // Para pagamentos exclusivamente de juros (parcial/renovação), força principal=0
      if (paymentType === 'PARTIAL_INTEREST' || paymentType === 'RENEW_INTEREST') {
        const onlyInterest = amountToPay;
        const lf = clamp0(Math.min(onlyInterest, safeCalc.lateFeeRemaining));
        const it = clamp0(onlyInterest - lf);
        amortization = { paidPrincipal: 0, paidInterest: it, paidLateFee: lf };
      }
    }

    const finalPrincipal = num(amortization?.paidPrincipal);
    const finalInterest = num(amortization?.paidInterest);
    const finalLateFee = num(amortization?.paidLateFee);
    const finalTotal = finalPrincipal + finalInterest + finalLateFee;

    if (finalTotal <= 0) {
      // blindagem final: nunca chama RPC com total 0
      throw new Error('Pagamento inválido: amortização zerada. Verifique o valor informado.');
    }

    /* =====================================================
       RPC PRINCIPAL (atomic_v2)
       - fecha contrato automaticamente quando todas parcelas ficam PAID
       - reduz risco de incompatibilidade de tipos no v3
    ===================================================== */
    const paymentDate = realDate || todayDateOnlyUTC();

    const caixaLivreId = await ensureCaixaLivreId(ownerId, sources);

    const payloadV2 = {
      p_idempotency_key: idempotencyKey,
      p_loan_id: safeUUID(loan.id),
      p_installment_id: safeUUID(inst.id),
      p_profile_id: ownerId,
      p_operator_id: safeUUID(activeUser.id),
      p_principal_amount: finalPrincipal,
      p_interest_amount: finalInterest,
      p_late_fee_amount: finalLateFee,
      p_payment_date: paymentDate.toISOString(),
    };

    const { error: v2Error } = await supabase.rpc('process_payment_atomic_v2', payloadV2);

    // Compatibilidade para ambientes sem v2 publicada
    if (!v2Error) {
      return {
        amountToPay,
        paymentType,
        amortization: {
          paidPrincipal: finalPrincipal,
          paidInterest: finalInterest,
          paidLateFee: finalLateFee,
        },
      };
    }

    const { error } = await supabase.rpc('process_payment_v3_selective', {
      p_idempotency_key: idempotencyKey,
      p_loan_id: safeUUID(loan.id),
      p_installment_id: safeUUID(inst.id),
      p_profile_id: ownerId,
      p_operator_id: safeUUID(activeUser.id),
      p_principal_paid: finalPrincipal,
      p_interest_paid: finalInterest,
      p_late_fee_paid: finalLateFee,
      p_payment_date: paymentDate.toISOString(),
      p_capitalize_remaining: capitalizeRemaining,
      p_source_id: safeUUID((loan as any).sourceId),
      p_caixa_livre_id: caixaLivreId,
    });

    if (error) throw new Error('Falha na persistência: ' + error.message);

    return { amountToPay, paymentType, amortization: { paidPrincipal: finalPrincipal, paidInterest: finalInterest, paidLateFee: finalLateFee } };
  },
};
