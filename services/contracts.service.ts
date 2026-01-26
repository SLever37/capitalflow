
import { supabase } from '../lib/supabase';
import { Loan, UserProfile, CapitalSource } from '../types';
import { onlyDigits, isTestClientName } from '../utils/formatters';
import { isValidCPForCNPJ } from '../utils/validators';
import { generateUUID } from '../utils/generators';
import { modalityRegistry } from '../domain/finance/modalities/registry';
import { getLoanDiff } from '../utils/auditHelpers';

export const contractsService = {
  async saveLoan(loan: Loan, activeUser: UserProfile, sources: CapitalSource[], editingLoan: Loan | null) {
    if (!activeUser) throw new Error("Usuário não autenticado");

    let finalSourceId = loan.sourceId;
    let finalClientId = loan.clientId;

    // Lógica de Fonte Padrão
    if (!finalSourceId) {
      const defaultSource = sources.find(s => s.name === 'Carteira Principal');
      if (defaultSource) finalSourceId = defaultSource.id;
      else { 
        const newId = generateUUID(); 
        await supabase.from('fontes').insert([{ id: newId, profile_id: activeUser.id, name: 'Carteira Principal', type: 'CASH', balance: 0 }]); 
        finalSourceId = newId; 
      }
    }

    // Lógica de Cliente
    const docClean = onlyDigits(loan.debtorDocument || '');
    if (!isTestClientName(loan.debtorName)) {
      if (!docClean || !isValidCPForCNPJ(docClean)) {
        throw new Error("CPF/CNPJ inválido para o cliente.");
      }
    }

    if (!finalClientId) {
      const newId = generateUUID();
      const { error: clientError } = await supabase.from('clientes').insert([{
        id: newId,
        profile_id: activeUser.id,
        name: loan.debtorName,
        phone: loan.debtorPhone,
        email: (loan as any).debtorEmail || null,
        address: loan.debtorAddress || 'Endereço do Contrato',
        created_at: new Date().toISOString(),
        access_code: String(Math.floor(1000 + Math.random() * 9000)),
        client_number: String(Math.floor(100000 + Math.random() * 900000)),
        document: docClean || null,
        cpf: (docClean.length === 11 ? docClean : null),
        cnpj: (docClean.length === 14 ? docClean : null)
      }]);
      if (clientError) throw new Error("Erro ao criar cliente: " + clientError.message);
      finalClientId = newId;
    }

    const principal = Number(loan.principal) || 0;
    const interestRate = Number(loan.interestRate) || 0;
    let totalToReceive = loan.totalToReceive;

    // --- LÓGICA DE SALDO ATÔMICA (Deltas via RPC) ---
    // Armazena as operações de saldo realizadas para possível rollback
    const rollbackOperations: Array<() => Promise<void>> = [];

    try {
        if (editingLoan) {
            const oldPrincipal = Number(editingLoan.principal) || 0;
            const diff = principal - oldPrincipal;

            if (editingLoan.sourceId !== finalSourceId) {
                // TROCA DE FONTE: Estorna integral na antiga, debita integral na nova
                await supabase.rpc('adjust_source_balance', { p_source_id: editingLoan.sourceId, p_delta: oldPrincipal });
                rollbackOperations.push(() => supabase.rpc('adjust_source_balance', { p_source_id: editingLoan.sourceId, p_delta: -oldPrincipal })); // Rollback

                await supabase.rpc('adjust_source_balance', { p_source_id: finalSourceId, p_delta: -principal });
                rollbackOperations.push(() => supabase.rpc('adjust_source_balance', { p_source_id: finalSourceId, p_delta: principal })); // Rollback
                
                // Log de Estorno técnico
                await supabase.from('transacoes').insert([{ 
                    id: generateUUID(), loan_id: loan.id, profile_id: activeUser.id, source_id: editingLoan.sourceId, 
                    date: new Date().toISOString(), type: 'REFUND_SOURCE_CHANGE', amount: oldPrincipal, 
                    principal_delta: 0, interest_delta: 0, late_fee_delta: 0, category: 'ESTORNO' 
                }]);
            } 
            else if (Math.abs(diff) > 0.01) {
                // MESMA FONTE: Debita apenas a diferença
                await supabase.rpc('adjust_source_balance', { p_source_id: finalSourceId, p_delta: -diff });
                rollbackOperations.push(() => supabase.rpc('adjust_source_balance', { p_source_id: finalSourceId, p_delta: diff })); // Rollback
            }
        } else {
            // NOVO CONTRATO: Debita valor principal total da fonte
            await supabase.rpc('adjust_source_balance', { p_source_id: finalSourceId, p_delta: -principal });
            rollbackOperations.push(() => supabase.rpc('adjust_source_balance', { p_source_id: finalSourceId, p_delta: principal })); // Rollback
        }

        const contractData: any = { 
          id: loan.id, profile_id: activeUser.id, client_id: finalClientId, source_id: finalSourceId, 
          debtor_name: loan.debtorName, debtor_phone: loan.debtorPhone, debtor_document: loan.debtorDocument, 
          principal, interest_rate: interestRate, fine_percent: Number(loan.finePercent) || 0, 
          daily_interest_percent: Number(loan.dailyInterestPercent) || 0, billing_cycle: loan.billingCycle || 'MONTHLY', 
          amortization_type: 'JUROS', start_date: loan.startDate, preferred_payment_method: loan.preferredPaymentMethod, 
          pix_key: loan.pixKey, notes: loan.notes, guarantee_description: loan.guaranteeDescription, is_archived: loan.isArchived || false
        };

        if (!editingLoan) contractData.created_at = new Date().toISOString();

        const strategy = modalityRegistry.get(loan.billingCycle);
        const { installments, totalToReceive: totalStrategy } = strategy.generateInstallments({ principal, rate: interestRate, startDate: loan.startDate });
        contractData.total_to_receive = totalStrategy;

        const { error: loanError } = await supabase.from('contratos').upsert(contractData);
        if (loanError) throw new Error(loanError.message);

        const installmentsPayload = installments.map((inst, index) => ({
            id: generateUUID(), loan_id: loan.id, profile_id: activeUser.id, numero_parcela: index + 1,
            due_date: inst.dueDate, amount: inst.amount, scheduled_principal: inst.scheduledPrincipal,
            scheduled_interest: inst.scheduledInterest, principal_remaining: inst.principalRemaining,
            interest_remaining: inst.interestRemaining, status: 'PENDING'
        }));

        await supabase.from('parcelas').delete().eq('loan_id', loan.id);
        const { error: instError } = await supabase.from('parcelas').insert(installmentsPayload);
        if (instError) throw new Error(instError.message);

        // Auditoria simplificada
        if (editingLoan) {
            const diffLog = getLoanDiff(editingLoan, loan);
            if (Object.keys(diffLog).length > 0) {
                await supabase.from('transacoes').insert([{ 
                    id: generateUUID(), loan_id: loan.id, profile_id: activeUser.id, source_id: finalSourceId, 
                    date: new Date().toISOString(), type: 'ADJUSTMENT', amount: 0, 
                    principal_delta: 0, interest_delta: 0, late_fee_delta: 0, notes: JSON.stringify(diffLog), category: 'AUDIT'
                }]);
            }
        } else {
            await supabase.from('transacoes').insert([{ 
                id: generateUUID(), loan_id: loan.id, profile_id: activeUser.id, source_id: finalSourceId, 
                date: new Date().toISOString(), type: 'LEND_MORE', amount: principal, category: 'INVESTIMENTO'
            }]);
        }

    } catch (error: any) {
        console.error("Erro no processo de salvamento. Iniciando rollback de saldo...", error);
        // Executa rollbacks em ordem reversa
        for (const rollback of rollbackOperations.reverse()) {
            await rollback().catch(e => console.error("Falha fatal no rollback:", e));
        }
        throw new Error("Erro ao salvar contrato: " + error.message);
    }
  },

  async saveNote(loanId: string, text: string) {
    await supabase.from('contratos').update({ notes: text }).eq('id', loanId);
  }
};
