// services/ledger/ledgerActions.ts
import { supabase } from '../../lib/supabase';
import { Loan, UserProfile, CapitalSource } from '../../types';
import { generateUUID } from '../../utils/generators';
import { getOwnerId, toNumber } from './ledgerHelpers';
import { logArchive, logRestore } from './ledgerAudit';
import { isUUID, safeUUID } from '../../utils/uuid';

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
  if (activeUser.id === 'DEMO') return 'Ação realizada (Demo)';

  const ownerId = getOwnerId(activeUser);
  if (!isUUID(ownerId)) return 'Ação realizada (Demo/Inválido)';

  // 1) Reembolso de capital na fonte (opcional)
  if (refundChecked && loan && loan.sourceId && (type === 'DELETE' || type === 'ARCHIVE')) {
    const remainingPrincipal = (loan.installments || []).reduce(
      (sum: number, i: any) => sum + toNumber(i.principalRemaining),
      0
    );

    if (remainingPrincipal > 0) {
      const source = sources.find((s) => s.id === loan.sourceId);
      if (source) {
        const { error: refundError } = await supabase
          .from('fontes')
          .update({ balance: toNumber(source.balance) + remainingPrincipal })
          .eq('id', safeUUID(source.id))
          .eq('profile_id', safeUUID(ownerId));

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
    // ✅ contratos pertencem ao DONO (coluna: owner_id)
    const { error } = await supabase.from('contratos').delete().eq('id', safeUUID(targetId)).eq('owner_id', safeUUID(ownerId));
    if (error) throw error;
    return 'Contrato Excluído permanentemente.';
  }

  if (type === 'ARCHIVE') {
    const { error } = await supabase.from('contratos').update({ is_archived: true }).eq('id', safeUUID(targetId)).eq('owner_id', safeUUID(ownerId));
    if (error) throw error;

    await logArchive(ownerId, targetId, loan?.sourceId);
    return 'Contrato Arquivado.';
  }

  if (type === 'RESTORE') {
    const { error } = await supabase.from('contratos').update({ is_archived: false }).eq('id', safeUUID(targetId)).eq('owner_id', safeUUID(ownerId));
    if (error) throw error;

    await logRestore(ownerId, targetId, loan?.sourceId);
    return 'Contrato Restaurado.';
  }

  if (type === 'DELETE_CLIENT') {
    // ✅ clientes pertencem ao DONO (coluna: owner_id)
    // ✅ deleção em cascata (app-side) para evitar FK travando:
    // 1) pegar loans do cliente
    const { data: loanIdsData, error: loanIdsErr } = await supabase
      .from('contratos')
      .select('id')
      .eq('owner_id', safeUUID(ownerId))
      .eq('client_id', safeUUID(targetId));

    if (loanIdsErr) throw loanIdsErr;

    const loanIds = (loanIdsData || []).map((r: any) => r.id).filter(Boolean);

    if (loanIds.length > 0) {
      // 2) apagar dependências por loan_id (tabelas que você citou no schema)
      const deletes = [
        supabase.from('sinalizacoes_pagamento').delete().in('loan_id', loanIds).eq('profile_id', safeUUID(ownerId)),
        supabase.from('transacoes').delete().in('loan_id', loanIds).eq('profile_id', safeUUID(ownerId)),
        supabase.from('parcelas').delete().in('loan_id', loanIds).eq('profile_id', safeUUID(ownerId)),
        // acordos: depende do seu schema, mas normalmente tem loan_id
        supabase.from('acordo_parcelas').delete().in('loan_id', loanIds).eq('profile_id', safeUUID(ownerId)),
        supabase.from('acordos_inadimplencia').delete().in('loan_id', loanIds).eq('profile_id', safeUUID(ownerId)),
      ];

      const results = await Promise.allSettled(deletes);

      // se alguma tabela não existir/coluna não existir no seu projeto, isso pode falhar:
      // nesse caso você me manda o erro exato e eu ajusto para o seu schema REAL.
      for (const r of results) {
        if (r.status === 'fulfilled' && (r.value as any)?.error) {
          throw (r.value as any).error;
        }
      }

      // 3) apagar contratos
      const { error: delLoansErr } = await supabase
        .from('contratos')
        .delete()
        .in('id', loanIds)
        .eq('owner_id', safeUUID(ownerId));

      if (delLoansErr) throw delLoansErr;
    }

    // 4) apagar cliente
    const { error: delClientErr } = await supabase
      .from('clientes')
      .delete()
      .eq('id', safeUUID(targetId))
      .eq('owner_id', safeUUID(ownerId));

    if (delClientErr) throw delClientErr;

    return 'Cliente removido (com contratos e histórico).';
  }

  if (type === 'DELETE_SOURCE') {
    const { error } = await supabase.from('fontes').delete().eq('id', safeUUID(targetId)).eq('profile_id', safeUUID(ownerId));
    if (error) throw error;
    return 'Fonte removida.';
  }

  return 'Ação concluída';
}