
import { supabase } from '../lib/supabase';
import { Loan, UserProfile, CapitalSource } from '../types';
import { onlyDigits, isTestClientName } from '../utils/formatters';
import { isValidCPForCNPJ } from '../utils/validators';
import { generateUUID } from '../utils/generators';
import { modalityRegistry } from '../domain/finance/modalities/registry';
import { getLoanDiff } from '../utils/auditHelpers';

// Helper para atualizar saldo com fallback (Robustez)
const updateSourceBalance = async (sourceId: string, delta: number) => {
    // 1. Tenta RPC (Ideal para concorrência)
    const { error: rpcError } = await supabase.rpc('adjust_source_balance', { 
        p_source_id: sourceId, 
        p_delta: delta 
    });

    if (!rpcError) return;

    // 2. Fallback Manual (Se RPC falhar por não existir)
    if (rpcError.message?.includes('function') || rpcError.message?.includes('schema cache')) {
        console.warn('RPC adjust_source_balance indisponível. Usando atualização manual.');
        
        const { data: source, error: fetchError } = await supabase
            .from('fontes')
            .select('balance')
            .eq('id', sourceId)
            .single();
            
        if (fetchError) throw new Error(`Erro ao ler saldo da fonte: ${fetchError.message}`);
        
        const currentBalance = Number(source.balance) || 0;
        const newBalance = currentBalance + delta;
        
        const { error: updateError } = await supabase
            .from('fontes')
            .update({ balance: newBalance })
            .eq('id', sourceId);
            
        if (updateError) throw new Error(`Erro ao atualizar saldo manualmente: ${updateError.message}`);
    } else {
        // Outros erros (permissão, etc)
        throw new Error(`Erro no ajuste de saldo: ${rpcError.message}`);
    }
};

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
        const { error: sourceError } = await supabase.from('fontes').insert([{ id: newId, profile_id: activeUser.id, name: 'Carteira Principal', type: 'CASH', balance: 0 }]); 
        if (sourceError) throw new Error("Erro ao criar fonte padrão: " + sourceError.message);
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

    // Validação de Funding (Cartão)
    if (loan.fundingTotalPayable && loan.fundingTotalPayable < principal) {
        throw new Error("O valor total a pagar no cartão não pode ser menor que o valor do empréstimo.");
    }

    // --- LÓGICA DE SALDO ATÔMICA (Deltas) ---
    const rollbackOperations: Array<() => Promise<void>> = [];

    try {
        if (editingLoan) {
            const oldPrincipal = Number(editingLoan.principal) || 0;
            const diff = principal - oldPrincipal;

            if (editingLoan.sourceId !== finalSourceId) {
                // TROCA DE FONTE: Estorna integral na antiga, debita integral na nova
                
                // 1. Estorno na Antiga
                await updateSourceBalance(editingLoan.sourceId, oldPrincipal);
                
                rollbackOperations.push(async () => { 
                    await updateSourceBalance(editingLoan.sourceId, -oldPrincipal); 
                });

                // 2. Débito na Nova
                await updateSourceBalance(finalSourceId, -principal);

                rollbackOperations.push(async () => { 
                    await updateSourceBalance(finalSourceId, principal); 
                });
                
                // Log de Estorno técnico
                await supabase.from('transacoes').insert([{ 
                    id: generateUUID(), loan_id: loan.id, profile_id: activeUser.id, source_id: editingLoan.sourceId, 
                    date: new Date().toISOString(), type: 'REFUND_SOURCE_CHANGE', amount: oldPrincipal, 
                    principal_delta: 0, interest_delta: 0, late_fee_delta: 0, category: 'ESTORNO' 
                }]);
            } 
            else if (Math.abs(diff) > 0.01) {
                // MESMA FONTE: Debita apenas a diferença
                await updateSourceBalance(finalSourceId, -diff);

                rollbackOperations.push(async () => { 
                    await updateSourceBalance(finalSourceId, diff); 
                });
            }
        } else {
            // NOVO CONTRATO: Debita valor principal total da fonte
            await updateSourceBalance(finalSourceId, -principal);

            rollbackOperations.push(async () => { 
                await updateSourceBalance(finalSourceId, principal); 
            });
        }

        const contractData: any = { 
          id: loan.id, profile_id: activeUser.id, client_id: finalClientId, source_id: finalSourceId, 
          debtor_name: loan.debtorName, debtor_phone: loan.debtorPhone, debtor_document: loan.debtorDocument, 
          principal, interest_rate: interestRate, fine_percent: Number(loan.finePercent) || 0, 
          daily_interest_percent: Number(loan.dailyInterestPercent) || 0, billing_cycle: loan.billingCycle || 'MONTHLY', 
          amortization_type: 'JUROS', start_date: loan.startDate, preferred_payment_method: loan.preferredPaymentMethod, 
          pix_key: loan.pixKey, notes: loan.notes, guarantee_description: loan.guaranteeDescription, is_archived: loan.isArchived || false,
          // Funding Fields
          funding_total_payable: loan.fundingTotalPayable || null,
          funding_cost: loan.fundingCost || null,
          funding_provider: loan.fundingProvider || null,
          funding_fee_percent: loan.fundingFeePercent || null
        };

        if (!editingLoan) contractData.created_at = new Date().toISOString();

        const strategy = modalityRegistry.get(loan.billingCycle);
        const { installments, totalToReceive: totalStrategy } = strategy.generateInstallments({ principal, rate: interestRate, startDate: loan.startDate });
        contractData.total_to_receive = totalStrategy;

        const { error: loanError } = await supabase.from('contratos').upsert(contractData);
        if (loanError) throw new Error("Erro ao salvar dados do contrato: " + loanError.message);

        const installmentsPayload = installments.map((inst, index) => ({
            id: generateUUID(), loan_id: loan.id, profile_id: activeUser.id, numero_parcela: index + 1,
            due_date: inst.dueDate, amount: inst.amount, scheduled_principal: inst.scheduledPrincipal,
            scheduled_interest: inst.scheduledInterest, principal_remaining: inst.principalRemaining,
            interest_remaining: inst.interestRemaining, status: 'PENDING'
        }));

        await supabase.from('parcelas').delete().eq('loan_id', loan.id);
        const { error: instError } = await supabase.from('parcelas').insert(installmentsPayload);
        if (instError) throw new Error("Erro ao gerar parcelas: " + instError.message);

        // REGISTRO DE CUSTO DE CAPTAÇÃO (LEDGER)
        if (loan.fundingCost && loan.fundingCost > 0) {
            // Remove registro anterior se for edição para evitar duplicidade
            if (editingLoan) {
                await supabase.from('transacoes')
                    .delete()
                    .eq('loan_id', loan.id)
                    .eq('type', 'CUSTO_CAPTACAO');
            }

            // Insere novo custo (Valor negativo no ledger indica saída/custo)
            await supabase.from('transacoes').insert([{ 
                id: generateUUID(), 
                loan_id: loan.id, 
                profile_id: activeUser.id, 
                source_id: finalSourceId, 
                date: new Date().toISOString(), 
                type: 'CUSTO_CAPTACAO', 
                amount: -Math.abs(loan.fundingCost), // Negativo pois é custo
                principal_delta: 0, 
                interest_delta: 0, 
                late_fee_delta: 0, 
                category: 'DESPESA_FINANCEIRA',
                notes: `Custo de Captação (${loan.fundingProvider || 'Cartão'}): R$ ${loan.fundingCost.toFixed(2)}`
            }]);
        }

        // Auditoria simplificada e Registro de Saída
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
            // REGISTRO OFICIAL DE SAÍDA DE CAIXA
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
        throw error; 
    }
  },

  async saveNote(loanId: string, text: string) {
    await supabase.from('contratos').update({ notes: text }).eq('id', loanId);
  }
};
