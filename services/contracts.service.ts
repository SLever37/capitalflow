// services/contracts.service.ts
import { supabase } from '../lib/supabase';
import { UserProfile, Loan, CapitalSource } from '../types';
import { generateUUID } from '../utils/generators';

/* =========================
   Helpers de Sanitização
========================= */
const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeUUID = (v: any) => (isUUID(v) ? v : null);
const ensureUUID = (v: any) => (isUUID(v) ? v : generateUUID());

const safeFloat = (v: any): number => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const str = String(v).trim();
  if (str.includes('.') && str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  if (str.includes(',')) return parseFloat(str.replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

export const contractsService = {
  async saveLoan(loan: Loan, activeUser: UserProfile, _sources: CapitalSource[], editingLoan: Loan | null) {
    if (!activeUser?.id) throw new Error('Usuário não autenticado.');

    // ✅ ownerId = dono da conta (supervisor) ou o próprio usuário
    const ownerId = safeUUID((activeUser as any).supervisor_id) || safeUUID(activeUser.id);
    if (!ownerId) throw new Error('Perfil inválido.');

    let finalClientId = safeUUID(loan.clientId);

    // --- LÓGICA DE CLIENTE (Criação ou Busca Inteligente) ---
    if (!finalClientId && loan.debtorName) {
      const cleanName = loan.debtorName.trim();
      const cleanDoc = loan.debtorDocument?.replace(/\D/g, '');

      // 1) Busca por documento (se existir)
      if (cleanDoc && cleanDoc.length >= 11) {
        const { data: existingByDoc, error: e1 } = await supabase
          .from('clientes')
          .select('id')
          .eq('owner_id', ownerId)
          .eq('document', loan.debtorDocument)
          .maybeSingle();
        if (e1) throw new Error(e1.message);
        if (existingByDoc?.id) finalClientId = existingByDoc.id;
      }

      // 2) Busca por nome (case-insensitive)
      if (!finalClientId) {
        const { data: existingByName, error: e2 } = await supabase
          .from('clientes')
          .select('id')
          .eq('owner_id', ownerId)
          .ilike('name', cleanName)
          .maybeSingle();
        if (e2) throw new Error(e2.message);
        if (existingByName?.id) finalClientId = existingByName.id;
      }

      // 3) Cria cliente se não existir
      if (!finalClientId) {
        const newId = generateUUID();
        const { error: createError } = await supabase.from('clientes').insert({
          id: newId,
          owner_id: ownerId, // ✅ clientes = owner_id
          name: cleanName,
          phone: loan.debtorPhone || null,
          document: loan.debtorDocument || null,
          address: loan.debtorAddress || null,
          access_code: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
          client_number: String(Math.floor(100000 + Math.random() * 900000)),
          notes: 'Gerado automaticamente ao criar contrato',
          created_at: new Date().toISOString(),
        });
        if (createError) throw new Error('Erro ao criar ficha do cliente: ' + createError.message);
        finalClientId = newId;
      }
    }

    const loanId = editingLoan ? loan.id : ensureUUID(loan.id);
    const principal = safeFloat(loan.principal);

    // ✅ contratos = owner_id
    const loanPayload: any = {
      id: loanId,
      owner_id: ownerId,
      operador_responsavel_id: activeUser.accessLevel === 1 ? null : safeUUID(activeUser.id),
      client_id: finalClientId,
      source_id: safeUUID(loan.sourceId),

      debtor_name: loan.debtorName,
      debtor_phone: loan.debtorPhone,
      debtor_document: loan.debtorDocument,
      debtor_address: loan.debtorAddress,

      preferred_payment_method: loan.preferredPaymentMethod,
      pix_key: loan.pixKey,

      principal,
      interest_rate: safeFloat(loan.interestRate),
      fine_percent: safeFloat(loan.finePercent),
      daily_interest_percent: safeFloat(loan.dailyInterestPercent),

      billing_cycle: loan.billingCycle,
      amortization_type: loan.amortizationType,
      start_date: loan.startDate,
      total_to_receive: safeFloat(loan.totalToReceive),

      notes: loan.notes,
      guarantee_description: loan.guaranteeDescription,
      is_archived: loan.isArchived || false,

      funding_total_payable: loan.fundingTotalPayable,
      funding_cost: loan.fundingCost,
      funding_provider: loan.fundingProvider,
      funding_fee_percent: loan.fundingFeePercent,

      policies_snapshot: loan.policiesSnapshot,
      cliente_foto_url: loan.clientAvatarUrl,
    };

    if (editingLoan) {
      const { error } = await supabase.from('contratos').update(loanPayload).eq('id', loanId);
      if (error) throw new Error(error.message);

      // ✅ parcelas = profile_id (conforme seu schema)
      if (loan.installments?.length) {
        const instPayload = loan.installments.map((inst) => ({
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
        }));

        const { error: upsertErr } = await supabase.from('parcelas').upsert(instPayload, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
      }
    } else {
      const { error } = await supabase
        .from('contratos')
        .insert({ ...loanPayload, created_at: new Date().toISOString() });
      if (error) throw new Error(error.message);

      if (loan.installments?.length) {
        const instPayload = loan.installments.map((inst) => ({
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
          paid_total: 0,
        }));

        const { error: instErr } = await supabase.from('parcelas').insert(instPayload);
        if (instErr) throw instErr;
      }

      // Saída de Caixa (novo contrato)
      if (safeUUID(loan.sourceId)) {
        await supabase.rpc('adjust_source_balance', { p_source_id: loan.sourceId, p_delta: -principal });

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
          notes: 'Empréstimo Inicial',
        });
      }
    }

    return true;
  },

  async saveNote(loanId: string, note: string) {
    if (!isUUID(loanId)) throw new Error('ID inválido.');
    const { error } = await supabase.from('contratos').update({ notes: note }).eq('id', loanId);
    if (error) throw error;
    return true;
  },

  async addAporte(params: {
    loanId: string;
    amount: number;
    sourceId?: string;
    installmentId?: string;
    notes?: string;
    activeUser: UserProfile;
  }) {
    const { loanId, amount, sourceId, installmentId, notes, activeUser } = params;

    const ownerId = safeUUID((activeUser as any).supervisor_id) || safeUUID(activeUser.id);
    const safeAmount = safeFloat(amount);
    if (safeAmount <= 0) throw new Error('Valor inválido.');

    // ✅ aqui é isso mesmo: p_profile_id = ownerId
    const { error } = await supabase.rpc('apply_new_aporte_atomic', {
      p_loan_id: loanId,
      p_profile_id: ownerId,
      p_amount: safeAmount,
      p_source_id: safeUUID(sourceId),
      p_installment_id: safeUUID(installmentId),
      p_notes: notes || null,
      p_operator_id: safeUUID(activeUser.id),
    });

    if (error) throw new Error(error.message);
    return true;
  },
};