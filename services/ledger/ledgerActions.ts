// services/ledger/ledgerActions.ts
import { supabase } from '../../lib/supabase';
import { Loan, UserProfile, CapitalSource } from '../../types';
import { generateUUID } from '../../utils/generators';
import { getOwnerId, toNumber } from './ledgerHelpers';
import { logArchive, logRestore } from './ledgerAudit';
import { isUUID, safeUUID } from '../../utils/uuid';

export async function executeLedgerAction(params: {
  type: 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'DELETE_CLIENT' | 'DELETE_SOURCE' | 'ACTIVATE';
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

  // Reembolso de capital (opcional)
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
      }
    }
  }

  if (type === 'DELETE') {
    const loanId = safeUUID(targetId);
    const profileId = safeUUID(ownerId);

    // Deleção em cascata manual, sem a tabela de assinaturas que causa erro.
    const deletePromises = [
      supabase.from('documentos_juridicos').delete().eq('loan_id', loanId),
      supabase.from('acordo_parcelas').delete().eq('loan_id', loanId).eq('profile_id', profileId),
      supabase.from('acordos_inadimplencia').delete().eq('loan_id', loanId).eq('profile_id', profileId),
      supabase.from('payment_intents').delete().eq('loan_id', loanId).eq('profile_id', profileId),
      supabase.from('transacoes').delete().eq('loan_id', loanId).eq('profile_id', profileId),
      supabase.from('parcelas').delete().eq('loan_id', loanId).eq('profile_id', profileId),
    ];

    const results = await Promise.allSettled(deletePromises);
    results.forEach(result => {
      if (result.status === 'rejected') {
        console.warn('Falha ao limpar dependência:', result.reason?.message);
      } else if (result.value.error) {
        if (!result.value.error.message.includes('relation') && !result.value.error.message.includes('does not exist')) {
          console.warn('Erro ao limpar dependência:', result.value.error.message);
        }
      }
    });
    
    // Finalmente, apagar o contrato
    const { error } = await supabase.from('contratos').delete().eq('id', loanId).eq('owner_id', profileId);
    if (error) {
      if (error.message.includes('foreign key constraint')) {
        throw new Error('Falha ao apagar contrato: dependência não resolvida. Detalhes: ' + error.message);
      }
      throw error;
    }

    return 'Contrato e dados associados foram excluídos.';
  }

  if (type === 'DELETE_CLIENT') {
    const loanIdsResult = await supabase
      .from('contratos')
      .select('id')
      .eq('owner_id', safeUUID(ownerId))
      .eq('client_id', safeUUID(targetId));
    if (loanIdsResult.error) throw loanIdsResult.error;
    const loanIds = (loanIdsResult.data || []).map(r => r.id).filter(Boolean);

    if (loanIds.length > 0) {
        const cascadeDeletes = [
            supabase.from('documentos_juridicos').delete().in('loan_id', loanIds),
            supabase.from('acordo_parcelas').delete().in('loan_id', loanIds).eq('profile_id', safeUUID(ownerId)),
            supabase.from('acordos_inadimplencia').delete().in('loan_id', loanIds).eq('profile_id', safeUUID(ownerId)),
            supabase.from('payment_intents').delete().in('loan_id', loanIds).eq('profile_id', safeUUID(ownerId)),
            supabase.from('transacoes').delete().in('loan_id', loanIds).eq('profile_id', safeUUID(ownerId)),
            supabase.from('parcelas').delete().in('loan_id', loanIds).eq('profile_id', safeUUID(ownerId)),
        ];
        await Promise.allSettled(cascadeDeletes);
        const { error: delLoansErr } = await supabase
            .from('contratos')
            .delete()
            .in('id', loanIds)
            .eq('owner_id', safeUUID(ownerId));
        if (delLoansErr) throw delLoansErr;
    }

    const { error: delClientErr } = await supabase
      .from('clientes')
      .delete()
      .eq('id', safeUUID(targetId))
      .eq('owner_id', safeUUID(ownerId));
    if (delClientErr) throw delClientErr;

    return 'Cliente e todos os seus contratos foram removidos.';
  }

  // Manter outras ações (ARCHIVE, RESTORE, DELETE_SOURCE) como estão
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

  if (type === 'ACTIVATE') {
    const loanId = safeUUID(targetId);
    const profileId = safeUUID(ownerId);

    // 1. Busca se existe um acordo para este contrato
    const { data: agreement } = await supabase
      .from('acordos_inadimplencia')
      .select('id, status')
      .eq('loan_id', loanId)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasAgreement = !!agreement;
    const newStatus = hasAgreement ? 'EM_ACORDO' : 'ATIVO';

    // 2. Reativa o contrato principal
    const { error: loanErr } = await supabase
      .from('contratos')
      .update({ 
        status: newStatus, 
        is_archived: false,
        acordo_ativo_id: hasAgreement ? agreement.id : null
      })
      .eq('id', loanId)
      .eq('owner_id', profileId);
    
    if (loanErr) throw loanErr;

    // 3. Se houver acordo, reativa o acordo e congela parcelas originais
    if (hasAgreement) {
      await supabase
        .from('acordos_inadimplencia')
        .update({ status: 'ATIVO' })
        .eq('id', agreement.id);

      // Reativa as parcelas do acordo que estavam pagas para que o saldo volte a ser positivo
      await supabase
        .from('acordo_parcelas')
        .update({ 
          status: 'PENDING',
          valor_pago: 0 
        })
        .eq('acordo_id', agreement.id)
        .in('status', ['PAID', 'PAGO', 'QUITADO', 'FINALIZADO']);

      await supabase
        .from('parcelas')
        .update({ status: 'RENEGOCIADO' })
        .eq('loan_id', loanId)
        .in('status', ['PENDENTE', 'ATRASADO', 'PENDING', 'LATE', 'PAID', 'PAGO', 'QUITADO']);
    } else {
      // Se não houver acordo, reativa as parcelas originais
      // Apenas mudamos o status para PENDING. O saldo continuará 0 até que uma nova transação ou recalculo ocorra,
      // mas o status do contrato no DB já será ATIVO.
      await supabase
        .from('parcelas')
        .update({ 
          status: 'PENDING'
        })
        .eq('loan_id', loanId)
        .in('status', ['PAID', 'PAGO', 'QUITADO']);
    }

    return 'Contrato Reativado com sucesso.';
  }

  if (type === 'DELETE_SOURCE') {
    const { error } = await supabase.from('fontes').delete().eq('id', safeUUID(targetId)).eq('profile_id', safeUUID(ownerId));
    if (error) throw error;
    return 'Fonte removida.';
  }

  return 'Ação concluída';
}
