// services/ledger/ledgerReverse.ts
import { supabase } from '../../lib/supabase';
import { Loan, UserProfile, LedgerEntry } from '../../types';
import {
  getOwnerId,
  normalizeTransaction,
  isPaymentTx,
  isLendMoreTx,
  isAporteTx,
  calcSourceBalanceDelta,
  calcProfitToRemove,
  clampNonNegative,
  toNumber,
} from './ledgerHelpers';
import { logReversalAudit } from './ledgerAudit';

/**
 * Estorno (reversão) com regras:
 * - Juros/multa: removem apenas do "Lucro disponível" (perfis.interest_balance)
 * - Capital: sai/volta na fonte (carteira)
 * - Parcela/contrato volta ao estado anterior
 * - Estorno gravado como auditoria (não entra em contagem financeira)
 *
 * IMPORTANTE:
 * - Para evitar bugs de “frontend desatualizado”, na reversão de APORTE
 *   buscamos a parcela direto no BANCO (fonte da verdade).
 */
export async function reverseTransaction(
  transaction: LedgerEntry,
  activeUser: UserProfile,
  loan: Loan
) {
  if (!activeUser?.id) throw new Error('Usuário não autenticado');

  const ownerId = getOwnerId(activeUser);
  const tx = normalizeTransaction(transaction);

  const isPayment = isPaymentTx(tx.type);
  const isLendMore = isLendMoreTx(tx.type);
  const isAporte = isAporteTx(tx.type); // NOVO_APORTE (ou como você definir)

  // ✅ Permitir pagamento, lend_more e aporte
  if (!isPayment && !isLendMore && !isAporte) {
    throw new Error('Apenas Pagamentos, Empréstimos e Aportes podem ser estornados.');
  }

  /**
   * 1) Ajuste de caixa (fonte): SOMENTE capital
   * - Pagamento: remove do caixa o principal que tinha entrado (delta negativo)
   * - LEND_MORE / NOVO_APORTE: devolve ao caixa o valor emprestado/aportado (delta positivo)
   */
  const balanceDelta = calcSourceBalanceDelta(tx);

  if (tx.sourceId && balanceDelta !== 0) {
    const { error: balanceError } = await supabase.rpc('adjust_source_balance', {
      p_source_id: tx.sourceId,
      p_delta: balanceDelta,
    });
    if (balanceError) throw new Error('Erro ao reverter saldo da fonte.');
  }

  /**
   * 2) Ajuste do lucro disponível: (juros + multa) APENAS para pagamento
   * - Juros/multa não existem “na carteira”; eles só existem em interest_balance.
   */
  const profitToRemove = calcProfitToRemove(tx);

  if (profitToRemove > 0) {
    const { data: profile, error: profileErr } = await supabase
      .from('perfis')
      .select('interest_balance')
      .eq('id', ownerId)
      .maybeSingle();

    if (profileErr) throw profileErr;

    const currentProfit = toNumber((profile as any)?.interest_balance);
    const nextProfit = clampNonNegative(currentProfit - profitToRemove);

    const { error: updProfitErr } = await supabase
      .from('perfis')
      .update({ interest_balance: nextProfit })
      .eq('id', ownerId);

    if (updProfitErr) throw updProfitErr;
  }

  /**
   * 3) Reverter estado do contrato/parcela
   * - Pagamento: volta a dívida (soma nos remaining) + reduz pagos
   * - NOVO_APORTE: desfaz o que foi adicionado (subtrai do remaining/scheduled/valor)
   */
  if (tx.installmentId) {
    // Para pagamento, podemos usar o objeto do loan pra restaurar paid_*,
    // mas para APORTE é obrigatório ler do banco pra não usar estado antigo do frontend.
    const instFromLoan: any = (loan.installments || []).find(
      (i: any) => i.id === tx.installmentId
    );

    // --- 3A) Reversão de PAGAMENTO ---
    if (isPayment && instFromLoan) {
      const restoredPrincipalRemaining =
        toNumber(instFromLoan.principalRemaining) + toNumber(tx.principalDelta);
      const restoredInterestRemaining =
        toNumber(instFromLoan.interestRemaining) + toNumber(tx.interestDelta);

      const restoredPaidTotal = clampNonNegative(
        toNumber(instFromLoan.paidTotal) - toNumber(tx.amount)
      );
      const restoredPaidPrincipal = clampNonNegative(
        toNumber(instFromLoan.paidPrincipal) - toNumber(tx.principalDelta)
      );
      const restoredPaidInterest = clampNonNegative(
        toNumber(instFromLoan.paidInterest) - toNumber(tx.interestDelta)
      );
      const restoredPaidLateFee = clampNonNegative(
        toNumber(instFromLoan.paidLateFee) - toNumber(tx.lateFeeDelta)
      );

      const { error: instErr } = await supabase
        .from('parcelas')
        .update({
          principal_remaining: restoredPrincipalRemaining,
          interest_remaining: restoredInterestRemaining,
          paid_total: restoredPaidTotal,
          paid_principal: restoredPaidPrincipal,
          paid_interest: restoredPaidInterest,
          paid_late_fee: restoredPaidLateFee,
          status: 'PENDING',
        })
        .eq('id', tx.installmentId);

      if (instErr) throw instErr;
    }

    // --- 3B) Reversão de NOVO_APORTE ---
    if (isAporte) {
      const deltaPrincipal = toNumber(tx.principalDelta || tx.amount);
      const deltaAmount = toNumber(tx.amount);

      // ✅ FONTE DA VERDADE: busca no banco
      const { data: dbInst, error: dbErr } = await supabase
        .from('parcelas')
        .select('principal_remaining, scheduled_principal, valor_parcela')
        .eq('id', tx.installmentId)
        .maybeSingle();

      if (dbErr) throw dbErr;
      if (!dbInst) throw new Error('Parcela não encontrada para estorno do aporte.');

      const currentPrincipalRemaining = toNumber((dbInst as any).principal_remaining);
      const currentScheduledPrincipal = toNumber((dbInst as any).scheduled_principal);
      const currentValorParcela = toNumber((dbInst as any).valor_parcela);

      const nextPrincipalRemaining = clampNonNegative(
        currentPrincipalRemaining - deltaPrincipal
      );
      const nextScheduledPrincipal = clampNonNegative(
        currentScheduledPrincipal - deltaPrincipal
      );
      const nextValorParcela = clampNonNegative(currentValorParcela - deltaAmount);

      const { error: instErr } = await supabase
        .from('parcelas')
        .update({
          principal_remaining: nextPrincipalRemaining,
          scheduled_principal: nextScheduledPrincipal,
          valor_parcela: nextValorParcela,
          status: 'PENDING',
        })
        .eq('id', tx.installmentId);

      if (instErr) throw instErr;

      // ✅ Também reduz o principal do contrato (aporte aumentou no header)
      const { error: adjErr } = await supabase.rpc('adjust_loan_principal', {
        p_loan_id: loan.id,
        p_delta: -deltaAmount,
      });

      if (adjErr) throw adjErr;
    }
  } else if (isLendMore) {
    // ✅ Estorno de LEND_MORE sem parcela: reduz principal total do contrato
    const { error: adjErr } = await supabase.rpc('adjust_loan_principal', {
      p_loan_id: loan.id,
      p_delta: -toNumber(tx.amount),
    });

    if (adjErr) throw adjErr;
  }

  /**
   * 4) Log auditável (não entra em somatórios)
   * - amount/deltas = 0 no log
   * - category = 'SISTEMA'
   */
  const reversedPrincipal =
    isPayment ? toNumber(tx.principalDelta) : (isLendMore || isAporte) ? toNumber(tx.amount) : 0;

  const reversedProfit = isPayment ? profitToRemove : 0;

  await logReversalAudit({
    ownerId,
    loanId: loan.id,
    sourceId: tx.sourceId,
    installmentId: tx.installmentId,
    originalTxId: tx.id,
    originalType: tx.type,
    reversedPrincipal,
    reversedProfit,
    notes: tx.notes,
  });

  return 'Estorno realizado: fonte ajustada (se aplicável), lucro ajustado (se aplicável) e contrato/parcela revertidos.';
}