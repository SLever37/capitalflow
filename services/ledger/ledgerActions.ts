// services/ledger/ledgerActions.ts
import { supabase } from '../../lib/supabase';
import { Loan, UserProfile, CapitalSource } from '../../types';
import { generateUUID } from '../../utils/generators';
import { getOwnerId, toNumber } from './ledgerHelpers';
import { logArchive, logRestore } from './ledgerAudit';

export async function executeLedgerAction(params: {
  type: 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'DELETE_CLIENT' | 'DELETE_SOURCE';
  targetId: string;
  loan?: Loan;
  activeUser: UserProfile;
  sources: CapitalSource[];
  refundChecked: boolean;
}) {
  const { type, targetId, loan, activeUser, sources, refundChecked } = params;
  if (!activeUser?.id) throw new Error('Usuário não autenticado');

  const ownerId = getOwnerId(activeUser);

  // 1) Reembolso de capital na fonte (opcional)
  if (refundChecked && loan && loan.sourceId && (type === 'DELETE' || type === 'ARCHIVE')) {
    const remainingPrincipal = (loan.installments || []).reduce((sum: number, i: any) => sum + toNumber(i.principalRemaining), 0);

    if (remainingPrincipal > 0) {
      const source = sources.find(s => s.id === loan.sourceId);
      if (source) {
        const { error: refundError } = await supabase
          .from('fontes')
          .update({ balance: toNumber(source.balance) + remainingPrincipal })
          .eq('id', source.id)
          .eq('profile_id', ownerId);

        if (refundError) throw refundError;

        // Log (não mexe no lucro)
        if (type === 'ARCHIVE') {
          const { error: logErr } = await supabase.from('transacoes').insert([
            {
              id: generateUUID(),
              loan_id: loan.id,
              profile_id: ownerId,
              source_id: source.id,
              date: new Date().toISOString(),
              type: 'REFUND_SOURCE_CHANGE',
              amount: remainingPrincipal,
              principal_delta: remainingPrincipal,
              interest_delta: 0,
              late_fee_delta: 0,
              notes: `Estorno de Capital (Arquivamento): R$ ${remainingPrincipal.toFixed(2)}`,
              category: 'ESTORNO',
            },
          ]);

          if (logErr) throw logErr;
        }
      }
    }
  }

  // 2) Ações
  if (type === 'DELETE') {
    const { error } = await supabase.from('contratos').delete().eq('id', targetId).eq('profile_id', ownerId);
    if (error) throw error;
    return 'Contrato Excluído permanentemente.';
  }

  if (type === 'ARCHIVE') {
    const { error } = await supabase.from('contratos').update({ is_archived: true }).eq('id', targetId).eq('profile_id', ownerId);
    if (error) throw error;

    await logArchive(ownerId, targetId, loan?.sourceId);
    return 'Contrato Arquivado.';
  }

  if (type === 'RESTORE') {
    const { error } = await supabase.from('contratos').update({ is_archived: false }).eq('id', targetId).eq('profile_id', ownerId);
    if (error) throw error;

    await logRestore(ownerId, targetId, loan?.sourceId);
    return 'Contrato Restaurado.';
  }

  if (type === 'DELETE_CLIENT') {
    const { error } = await supabase.from('clientes').delete().eq('id', targetId).eq('profile_id', ownerId);
    if (error) throw error;
    return 'Cliente removido.';
  }

  if (type === 'DELETE_SOURCE') {
    const { error } = await supabase.from('fontes').delete().eq('id', targetId).eq('profile_id', ownerId);
    if (error) throw error;
    return 'Fonte removida.';
  }

  return 'Ação concluída';
}