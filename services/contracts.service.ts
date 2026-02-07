import { supabase } from '../lib/supabase';
import { UserProfile, Loan, CapitalSource } from '../types';
import { generateUUID } from '../utils/generators';

/* =========================
   Helpers de Sanitização (CRÍTICO)
========================= */
const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeUUID = (v: any) => (isUUID(v) ? v : null);
const ensureUUID = (v: any) => (isUUID(v) ? v : generateUUID());

// Garante number válido (aceita string com vírgula pt-BR)
const safeFloat = (v: any): number => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const str = String(v).trim();
  if (str.includes('.') && str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
};

/* =========================
   Service
========================= */
export const contractsService = {
  async saveLoan(
    loan: Loan,
    activeUser: UserProfile,
    sources: CapitalSource[],
    editingLoan: Loan | null
  ) {
    if (!activeUser?.id) {
      throw new Error('Usuário não autenticado.');
    }

    const ownerId =
      safeUUID((activeUser as any).supervisor_id) ||
      safeUUID(activeUser.id);

    if (!ownerId) {
      throw new Error('Perfil inválido. Refaça o login.');
    }

    // --- AUTO-CRIAÇÃO OU VÍNCULO DE CLIENTE ---
    let finalClientId = safeUUID(loan.clientId);

    const shouldCheckClient = !finalClientId && loan.debtorName && loan.debtorName.trim().length > 0;

    if (shouldCheckClient) {
      // 1. Tenta encontrar cliente existente pelo CPF/CNPJ
      if (loan.debtorDocument && loan.debtorDocument.trim().length > 0) {
        const { data: existingClient } = await supabase
          .from('clientes')
          .select('id')
          .eq('profile_id', ownerId)
          .eq('document', loan.debtorDocument)
          .maybeSingle();

        if (existingClient) {
          console.log('[ContractsService] Cliente existente encontrado via CPF. Vinculando:', existingClient.id);
          finalClientId = existingClient.id;
        }
      }

      // 2. Se ainda não tem ID (não existe), cria um novo
      if (!finalClientId) {
        const newClientId = generateUUID();
        // Gera códigos aleatórios simples para o cliente automático
        const accessCode = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const clientNumber = String(Math.floor(100000 + Math.random() * 900000));

        const { error: clientError } = await supabase.from('clientes').insert({
          id: newClientId,
          profile_id: ownerId,
          name: loan.debtorName,
          phone: loan.debtorPhone || null,
          document: loan.debtorDocument || null,
          address: loan.debtorAddress || null,
          access_code: accessCode,
          client_number: clientNumber,
          notes: 'Criado automaticamente via Novo Contrato',
          created_at: new Date().toISOString()
        });

        if (clientError) {
          console.error("Erro auto-criação cliente:", clientError);
          throw new Error("Erro ao criar cliente automaticamente: " + clientError.message);
        }

        console.log('[ContractsService] Novo cliente criado automaticamente:', newClientId);
        finalClientId = newClientId;
      }
    }

    const loanId = editingLoan ? loan.id : ensureUUID(loan.id);
    const principal = safeFloat(loan.principal);
    const totalToReceive = safeFloat(loan.totalToReceive);

    const loanPayload = {
      id: loanId,
      profile_id: ownerId,
      operador_responsavel_id:
        activeUser.accessLevel === 1 ? null : safeUUID(activeUser.id),

      client_id: finalClientId, // Usa o ID resolvido (existente ou novo)
      source_id: safeUUID(loan.sourceId),

      debtor_name: loan.debtorName,
      debtor_phone: loan.debtorPhone,
      debtor_document: loan.debtorDocument,
      debtor_address: loan.debtorAddress,

      preferred_payment_method: loan.preferredPaymentMethod || null,
      pix_key: loan.pixKey || null,

      principal: principal,
      interest_rate: safeFloat(loan.interestRate),
      fine_percent: safeFloat(loan.finePercent),
      daily_interest_percent: safeFloat(loan.dailyInterestPercent),

      billing_cycle: loan.billingCycle,
      amortization_type: loan.amortizationType,
      start_date: loan.startDate,
      total_to_receive: totalToReceive,

      notes: loan.notes || null,
      guarantee_description: loan.guaranteeDescription || null,
      is_archived: loan.isArchived || false,

      funding_total_payable: loan.fundingTotalPayable || null,
      funding_cost: loan.fundingCost || null,
      funding_provider: loan.fundingProvider || null,
      funding_fee_percent: loan.fundingFeePercent || null,

      policies_snapshot: loan.policiesSnapshot || null,
      cliente_foto_url: loan.clientAvatarUrl || null
    };

    // =========================
    // ✅ PASSO 1: CORREÇÃO DO VENCIMENTO "VOLTA"
    // Ao editar contrato, atualizar também as PARCELAS
    // =========================
    if (editingLoan) {
      const { error } = await supabase
        .from('contratos')
        .update(loanPayload)
        .eq('id', loanId);

      if (error) throw new Error('Erro ao atualizar contrato: ' + error.message);

      // ✅ NOVO: Persistir vencimentos/valores das parcelas no DB
      if (loan.installments?.length) {
        const installmentsPayload = loan.installments.map(inst => ({
          id: ensureUUID(inst.id),
          loan_id: loanId,
          profile_id: ownerId,
          numero_parcela: inst.number || 1,
          data_vencimento: inst.dueDate, // <-- aqui está a data que a UI usa
          valor_parcela: safeFloat(inst.amount),
          amount: safeFloat(inst.amount),
          scheduled_principal: safeFloat(inst.scheduledPrincipal),
          scheduled_interest: safeFloat(inst.scheduledInterest),
          principal_remaining: safeFloat(inst.principalRemaining),
          interest_remaining: safeFloat(inst.interestRemaining),
          late_fee_accrued: safeFloat(inst.lateFeeAccrued),
        }));

        // Upsert: se existir, atualiza; se não existir, cria
        const { error: upsertErr } = await supabase
          .from('parcelas')
          .upsert(installmentsPayload, { onConflict: 'id' });

        if (upsertErr) throw new Error('Erro ao atualizar parcelas: ' + upsertErr.message);
      }

    } else {
      const { error } = await supabase
        .from('contratos')
        .insert({
          ...loanPayload,
          created_at: new Date().toISOString()
        });

      if (error) throw new Error('Erro ao criar contrato: ' + error.message);

      if (loan.installments?.length) {
        const installmentsPayload = loan.installments.map(inst => ({
          id: ensureUUID(inst.id),
          loan_id: loanId,
          profile_id: ownerId,
          numero_parcela: inst.number || 1,
          data_vencimento: inst.dueDate,
          valor_parcela: safeFloat(inst.amount),
          amount: safeFloat(inst.amount),
          scheduled_principal: safeFloat(inst.scheduledPrincipal),
          scheduled_interest: safeFloat(inst.scheduledInterest),
          principal_remaining: safeFloat(inst.principalRemaining),
          interest_remaining: safeFloat(inst.interestRemaining),
          late_fee_accrued: safeFloat(inst.lateFeeAccrued),
          status: 'PENDING',
          paid_total: 0
        }));

        const { error: instError } = await supabase
          .from('parcelas')
          .insert(installmentsPayload);

        if (instError) throw new Error('Erro ao criar parcelas: ' + instError.message);
      }

      if (safeUUID(loan.sourceId)) {
        await supabase.rpc('adjust_source_balance', {
          p_source_id: loan.sourceId,
          p_delta: -principal
        });

        await supabase.from('transacoes').insert({
          id: generateUUID(),
          loan_id: loanId,
          profile_id: ownerId,
          source_id: loan.sourceId,
          date: new Date().toISOString(),
          type: 'LEND_MORE',
          amount: principal,
          principal_delta: 0,
          interest_delta: 0,
          late_fee_delta: 0,
          category: 'INVESTIMENTO',
          notes: 'Empréstimo Inicial'
        });
      }
    }

    return true;
  },

  async saveNote(loanId: string, note: string) {
    if (!isUUID(loanId)) throw new Error('ID de contrato inválido.');
    const { error } = await supabase
      .from('contratos')
      .update({ notes: note })
      .eq('id', loanId);
    if (error) throw new Error('Erro ao salvar nota: ' + error.message);
    return true;
  },

  /* =========================
     Aporte (CORRIGIDO)
  ========================= */
  async addAporte(params: {
    loanId: string;
    amount: number;
    sourceId?: string;
    installmentId?: string;
    notes?: string;
    activeUser: UserProfile;
  }) {
    const { loanId, amount, sourceId, installmentId, notes, activeUser } = params;

    if (!activeUser?.id) throw new Error('Usuário não autenticado.');
    if (!isUUID(loanId)) throw new Error('Contrato inválido.');

    // Sanitização de valor e UUIDs vazios
    const safeAmount = safeFloat(amount);
    if (isNaN(safeAmount) || safeAmount <= 0) {
      throw new Error('O valor do aporte deve ser maior que zero.');
    }

    const ownerId = safeUUID((activeUser as any).supervisor_id) || safeUUID(activeUser.id);
    if (!ownerId) throw new Error('Perfil inválido.');

    // RPC com parâmetros sanitizados (UUID vazio vira null)
    const { error } = await supabase.rpc('apply_new_aporte_atomic', {
      p_loan_id: loanId,
      p_profile_id: ownerId,
      p_amount: safeAmount,
      p_source_id: safeUUID(sourceId),
      p_installment_id: safeUUID(installmentId),
      p_notes: notes || null,
      p_operator_id: safeUUID(activeUser.id)
    });

    if (error) throw new Error('Erro no aporte: ' + error.message);

    return true;
  }
};