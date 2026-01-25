
import { supabase } from '../lib/supabase';
import { Loan, UserProfile, CapitalSource, LedgerEntry } from '../types';
import { generateUUID } from '../utils/generators';

export const ledgerService = {
  async executeLedgerAction(params: {
    type: 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'DELETE_CLIENT' | 'DELETE_SOURCE';
    targetId: string;
    loan?: Loan;
    activeUser: UserProfile;
    sources: CapitalSource[];
    refundChecked: boolean;
  }) {
    const { type, targetId, loan, activeUser, sources, refundChecked } = params;

    // 1. Lógica de Reembolso (Devolução de Capital para a Fonte)
    if (refundChecked && loan && loan.sourceId && (type === 'DELETE' || type === 'ARCHIVE')) {
      const remainingPrincipal = loan.installments.reduce((sum, i) => sum + i.principalRemaining, 0);
      
      if (remainingPrincipal > 0) {
        const source = sources.find(s => s.id === loan.sourceId);
        if (source) {
          // Devolve saldo para a fonte (Aumenta o caixa do operador)
          await supabase.from('fontes')
            .update({ balance: source.balance + remainingPrincipal })
            .eq('id', source.id)
            .eq('profile_id', activeUser.id);

          // REGISTRA NO EXTRATO: Estorno
          if (type === 'ARCHIVE') {
             await supabase.from('transacoes').insert([{
                id: generateUUID(),
                loan_id: loan.id,
                profile_id: activeUser.id,
                source_id: source.id,
                date: new Date().toISOString(),
                type: 'REFUND_SOURCE_CHANGE',
                amount: remainingPrincipal,
                // CORREÇÃO: Em relatórios, delta positivo no principal indica redução da dívida do devedor (recuperação).
                // Como estamos arquivando e "recuperando" o saldo para o operador, tratamos como amortização técnica.
                principal_delta: remainingPrincipal, 
                interest_delta: 0,
                late_fee_delta: 0,
                notes: `Estorno de Capital (Arquivamento): R$ ${remainingPrincipal.toFixed(2)}`,
                category: 'ESTORNO'
             }]);
          }
        }
      }
    }

    // 2. Execução das Ações + Logs
    if (type === 'DELETE') {
      const { error } = await supabase.from('contratos').delete().eq('id', targetId).eq('profile_id', activeUser.id);
      if (error) throw error;
      return 'Contrato Excluído permanentemente.';
    }
    else if (type === 'ARCHIVE') {
      const { error } = await supabase.from('contratos').update({ is_archived: true }).eq('id', targetId).eq('profile_id', activeUser.id);
      if (error) throw error;
      
      // LOG VISUAL: Arquivamento
      await supabase.from('transacoes').insert([{
        id: generateUUID(),
        loan_id: targetId,
        profile_id: activeUser.id,
        source_id: loan?.sourceId,
        date: new Date().toISOString(),
        type: 'ARCHIVE',
        amount: 0,
        principal_delta: 0, interest_delta: 0, late_fee_delta: 0,
        notes: 'Contrato Arquivado',
        category: 'GERAL'
      }]);

      return 'Contrato Arquivado.';
    }
    else if (type === 'RESTORE') {
      const { error } = await supabase.from('contratos').update({ is_archived: false }).eq('id', targetId).eq('profile_id', activeUser.id);
      if (error) throw error;

      // LOG VISUAL: Restauração
      await supabase.from('transacoes').insert([{
        id: generateUUID(),
        loan_id: targetId,
        profile_id: activeUser.id,
        source_id: loan?.sourceId,
        date: new Date().toISOString(),
        type: 'RESTORE',
        amount: 0,
        principal_delta: 0, interest_delta: 0, late_fee_delta: 0,
        notes: 'Contrato Restaurado',
        category: 'GERAL'
      }]);

      return 'Contrato Restaurado.';
    }
    else if (type === 'DELETE_CLIENT') {
      const { error } = await supabase.from('clientes').delete().eq('id', targetId).eq('profile_id', activeUser.id);
      if (error) throw error;
      return 'Cliente removido.';
    }
    else if (type === 'DELETE_SOURCE') {
      const { error } = await supabase.from('fontes').delete().eq('id', targetId).eq('profile_id', activeUser.id);
      if (error) throw error;
      return 'Fonte removida.';
    }
    return 'Ação concluída';
  },

  // FUNÇÃO DE ESTORNO DE TRANSAÇÃO (REVERSÃO)
  async reverseTransaction(transaction: LedgerEntry, activeUser: UserProfile, loan: Loan) {
      // 1. Validar se é reversível
      if (!transaction.type.includes('PAYMENT') && transaction.type !== 'LEND_MORE') {
          throw new Error('Apenas Pagamentos e Empréstimos podem ser estornados.');
      }

      const amount = transaction.amount;
      const sourceId = transaction.sourceId;
      const installmentId = transaction.installmentId;

      // 2. Reverter Saldo da Fonte
      // Se foi PAGAMENTO (Entrada), devemos remover da fonte.
      // Se foi EMPRÉSTIMO (Saída), devemos devolver para a fonte.
      const isPayment = transaction.type.includes('PAYMENT');
      const balanceDelta = isPayment ? -amount : amount;

      if (sourceId) {
          const { error: balanceError } = await supabase.rpc('adjust_source_balance', { 
              p_source_id: sourceId, 
              p_delta: balanceDelta 
          });
          if (balanceError) throw new Error("Erro ao reverter saldo da fonte.");
      }

      // 3. Reverter Parcela (Se houver)
      if (installmentId) {
          const inst = loan.installments.find(i => i.id === installmentId);
          if (inst) {
              const currentPrincipal = inst.principalRemaining;
              const currentInterest = inst.interestRemaining;
              const currentPaidTotal = inst.paidTotal;

              // Calcula novos valores (Restaurando o que foi pago)
              // Nota: transaction.principalDelta é positivo quando pagou principal.
              const restoredPrincipal = currentPrincipal + (transaction.principalDelta || 0);
              const restoredInterest = currentInterest + (transaction.interestDelta || 0);
              const restoredPaidTotal = Math.max(0, currentPaidTotal - amount);

              const updatePayload: any = {
                  principal_remaining: restoredPrincipal,
                  interest_remaining: restoredInterest,
                  paid_total: restoredPaidTotal,
                  status: 'PENDING' // Força status pendente ao reverter, o cálculo reajustará depois
              };

              // Se estornar tudo que foi pago, zera os acumuladores de pago
              if (restoredPaidTotal <= 0) {
                  updatePayload.paid_principal = 0;
                  updatePayload.paid_interest = 0;
                  updatePayload.paid_late_fee = 0;
              } else {
                  // Redução parcial dos acumuladores
                  updatePayload.paid_principal = Math.max(0, inst.paidPrincipal - (transaction.principalDelta || 0));
                  updatePayload.paid_interest = Math.max(0, inst.paidInterest - (transaction.interestDelta || 0));
                  updatePayload.paid_late_fee = Math.max(0, inst.paidLateFee - (transaction.lateFeeDelta || 0));
              }

              await supabase.from('parcelas').update(updatePayload).eq('id', installmentId);
          }
      } else if (!isPayment) {
          // Se for estorno de LEND_MORE (Empréstimo adicional), precisamos reduzir o total do contrato
          // Isso é mais complexo, mas por hora vamos focar no estorno de pagamento.
          // Se for LEND_MORE, revertemos a lógica de 'process_lend_more_atomic' manualmente
          // Removendo do principal do contrato.
          const { error: loanUpdateError } = await supabase.rpc('adjust_loan_principal', {
              p_loan_id: loan.id,
              p_delta: -amount // Reduz o principal
          });
      }

      // 4. Excluir a Transação
      const { error: deleteError } = await supabase.from('transacoes').delete().eq('id', transaction.id);
      if (deleteError) throw new Error("Erro ao apagar registro de transação.");

      return "Transação estornada com sucesso.";
  }
};
