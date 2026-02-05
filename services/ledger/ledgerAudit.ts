// services/ledger/ledgerAudit.ts
import { supabase } from '../../lib/supabase';
import { generateUUID } from '../../utils/generators';

export async function logArchive(ownerId: string, loanId: string, sourceId?: string | null) {
  const { error } = await supabase.from('transacoes').insert([
    {
      id: generateUUID(),
      loan_id: loanId,
      profile_id: ownerId,
      source_id: sourceId || null,
      date: new Date().toISOString(),
      type: 'ARCHIVE',
      amount: 0,
      principal_delta: 0,
      interest_delta: 0,
      late_fee_delta: 0,
      notes: 'Contrato Arquivado',
      category: 'GERAL',
    },
  ]);
  if (error) throw error;
}

export async function logRestore(ownerId: string, loanId: string, sourceId?: string | null) {
  const { error } = await supabase.from('transacoes').insert([
    {
      id: generateUUID(),
      loan_id: loanId,
      profile_id: ownerId,
      source_id: sourceId || null,
      date: new Date().toISOString(),
      type: 'RESTORE',
      amount: 0,
      principal_delta: 0,
      interest_delta: 0,
      late_fee_delta: 0,
      notes: 'Contrato Restaurado',
      category: 'GERAL',
    },
  ]);
  if (error) throw error;
}

/**
 * Log auditável do estorno:
 * - NÃO entra em somatórios financeiros (amount/deltas = 0)
 * - category='SISTEMA' para ficar fácil ignorar em relatórios
 */
export async function logReversalAudit(params: {
  ownerId: string;
  loanId: string;
  sourceId: string | null;
  installmentId: string | null;
  originalTxId: string;
  originalType: string;
  reversedPrincipal: number;
  reversedProfit: number;
  notes?: string;
}) {
  const { ownerId, loanId, sourceId, installmentId, originalTxId, originalType, reversedPrincipal, reversedProfit, notes } = params;

  const { error } = await supabase.from('transacoes').insert({
    id: generateUUID(),
    loan_id: loanId,
    profile_id: ownerId,
    source_id: sourceId,
    installment_id: installmentId,
    date: new Date().toISOString(),
    type: 'ESTORNO',
    amount: 0,
    principal_delta: 0,
    interest_delta: 0,
    late_fee_delta: 0,
    category: 'SISTEMA',
    notes:
      `Estorno aplicado (auditoria). Ref=${originalTxId} | Orig=${originalType} | ` +
      `Revertido: capital=${Number(reversedPrincipal || 0).toFixed(2)}, ` +
      `juros+multa=${Number(reversedProfit || 0).toFixed(2)}` +
      (notes ? ` | Obs: ${notes}` : ''),
  });

  if (error) throw error;
}