// services/payments.service.ts
import { supabase } from '../lib/supabase';
import type { Loan, Installment, UserProfile, CapitalSource } from '../types';
import { todayDateOnlyUTC } from '../utils/dateHelpers';
import { generateUUID } from '../utils/generators';
import { loanEngine } from '../domain/loanEngine';
import { isUUID, safeUUID } from '../utils/uuid';

/* =========================
   Helpers
========================= */
const parseMoney = (v: string) => {
  if (!v) return 0;
  const clean = String(v).replace(/[R$\s]/g, '');
  if (clean.includes('.') && clean.includes(',')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (clean.includes(',')) return parseFloat(clean.replace(',', '.')) || 0;
  return parseFloat(clean) || 0;
};

const normalize = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

function resolveCaixaLivreIdFromMemory(sources: CapitalSource[]): string | null {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  const byFlag = (sources as any[]).find(
    (s) => s?.is_caixa_livre === true || s?.isCaixaLivre === true || s?.is_profit_box === true
  );
  if (byFlag?.id && isUUID(byFlag.id)) return byFlag.id;

  const caixaLivre = sources.find((s) => {
    const n = normalize((s as any)?.name);
    return n.includes('caixa livre') || n === 'lucro' || n.includes('lucro');
  });

  if (caixaLivre?.id && isUUID(caixaLivre.id)) return caixaLivre.id;

  return null;
}

async function resolveCaixaLivreIdFromDB(ownerId: string): Promise<string | null> {
  // tenta achar em public.fontes (nome “Caixa Livre” / “Lucro”), do profile_id do owner
  const { data, error } = await supabase
    .from('fontes')
    .select('id,nome')
    .eq('profile_id', ownerId)
    .limit(50);

  if (error || !data) return null;

  const found = data.find((f: any) => {
    const n = normalize(f?.nome);
    return n.includes('caixa livre') || n === 'lucro' || n.includes('lucro');
  });

  return found?.id && isUUID(found.id) ? found.id : null;
}

async function revalidateInstallment(instId: string) {
  const safeId = safeUUID(instId);
  if (!safeId) return null;

  const { data, error } = await supabase
    .from('parcelas')
    .select('id,status,principal_remaining,interest_remaining,late_fee_accrued,loan_id')
    .eq('id', safeId)
    .single();

  if (error) throw new Error('Falha ao revalidar parcela no banco: ' + error.message);
  return data as any;
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

    // 0) Autenticação mínima
    if (!activeUser?.id) {
      throw new Error('Usuário não autenticado. Refaça o login.');
    }

    if (activeUser.id === 'DEMO') {
      return { amountToPay: customAmount || Number(calculations?.total) || 0, paymentType };
    }

    // 1) OwnerId
    const ownerId =
      safeUUID((loan as any).profile_id) ||
      safeUUID((activeUser as any).supervisor_id) ||
      safeUUID(activeUser.id);

    if (!ownerId) throw new Error('Perfil inválido. Refaça o login.');

    // 2) Revalidação no banco (mata estado stale)
    const instDb = await revalidateInstallment(inst.id);

    const statusDb = String(instDb?.status || '').toUpperCase();
    const remainingDb =
      Number(instDb?.principal_remaining || 0) +
      Number(instDb?.interest_remaining || 0) +
      Number(instDb?.late_fee_accrued || 0);

    if (statusDb === 'PAID' || remainingDb <= 0.05) {
      throw new Error('Parcela já quitada (revalidado no banco). Atualize a tela.');
    }

    // 3) Idempotência
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
        p_idempotency_key: safeUUID(idempotencyKey) || idempotencyKey,
        p_loan_id: safeUUID(loan.id),
        p_installment_id: safeUUID(inst.id),
        p_profile_id: safeUUID(ownerId),
        p_operator_id: safeUUID(activeUser.id),
        p_source_id: safeUUID(sourceId),
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

    if (!Number.isFinite(amountToPay)) amountToPay = 0;
    if (amountToPay <= 0) {
      // Aqui é o caso clássico “já está pago / não tem saldo”, mas UI deixou clicar
      throw new Error('O valor do pagamento deve ser maior que zero. (Sem saldo a pagar / tela desatualizada)');
    }

    /* =====================================================
       AMORTIZAÇÃO SELETIVA (ENGINE)
    ===================================================== */
    const amortization = loanEngine.calculateAmortization(amountToPay, loan);

    const principalPaid = Number(amortization.paidPrincipal || 0);
    const interestPaid = Number(amortization.paidInterest || 0);
    const lateFeePaid = Number(amortization.paidLateFee || 0);
    const totalPaid = principalPaid + interestPaid + lateFeePaid;

    if (!Number.isFinite(totalPaid) || totalPaid <= 0) {
      throw new Error('O valor do pagamento deve ser maior que zero. (Amortização zerada / contrato sem saldo)');
    }

    /* =====================================================
       RPC OFICIAL V3 (Amortização + Fluxo de Caixa)
    ===================================================== */
    const paymentDate = realDate || todayDateOnlyUTC();

    const sourceId = safeUUID((loan as any).sourceId);
    if (!sourceId) throw new Error('Fonte do contrato inválida (sourceId).');

    // Caixa Livre: tenta primeiro do estado, depois do banco
    let caixaLivreId = resolveCaixaLivreIdFromMemory(sources);
    if (!caixaLivreId) {
      caixaLivreId = await resolveCaixaLivreIdFromDB(ownerId);
    }
    if (!caixaLivreId) {
      throw new Error('Caixa Livre (p_caixa_livre_id) não encontrada. Crie uma fonte "Caixa Livre" ou "Lucro" para este perfil.');
    }

    const { error } = await supabase.rpc('process_payment_v3_selective', {
      p_idempotency_key: idempotencyKey, 
      p_loan_id: safeUUID(loan.id),
      p_installment_id: safeUUID(inst.id),
      p_profile_id: safeUUID(ownerId),
      p_operator_id: safeUUID(activeUser.id),
      p_principal_paid: principalPaid,
      p_interest_paid: interestPaid,
      p_late_fee_paid: lateFeePaid,
      p_payment_date: paymentDate.toISOString().split('T')[0], // YYYY-MM-DD
      p_capitalize_remaining: !!capitalizeRemaining,
      p_source_id: safeUUID(sourceId),
      p_caixa_livre_id: safeUUID(caixaLivreId),
    });

    if (error) throw new Error('Falha na persistência: ' + error.message);

    return { amountToPay, paymentType, amortization };
  },
};