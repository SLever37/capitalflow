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
  if (str.includes('.') && str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
};

export const contractsService = {
  async saveLoan(
    loan: Loan,
    activeUser: UserProfile,
    sources: CapitalSource[],
    editingLoan: Loan | null
  ) {
    if (!activeUser?.id) throw new Error('Usuário não autenticado.');

    const ownerId =
      safeUUID((activeUser as any).supervisor_id) ||
      safeUUID(activeUser.id);

    if (!ownerId) throw new Error('Perfil inválido.');

    let finalClientId = safeUUID(loan.clientId);

    /* =========================
       CLIENTE
    ========================= */
    if (!finalClientId && loan.debtorName) {
      const cleanName = loan.debtorName.trim();
      const cleanDoc = loan.debtorDocument?.replace(/\D/g, '');

      if (cleanDoc && cleanDoc.length >= 11) {
        const { data } = await supabase
          .from('clientes')
          .select('id')
          .eq('profile_id', ownerId)
          .eq('document', loan.debtorDocument)
          .maybeSingle();

        if (data) finalClientId = data.id;
      }

      if (!finalClientId) {
        const { data } = await supabase
          .from('clientes')
          .select('id')
          .eq('profile_id', ownerId)
          .ilike('name', cleanName)
          .maybeSingle();

        if (data) finalClientId = data.id;
      }

      if (!finalClientId) {
        const newId = generateUUID();
        const { error } = await supabase.from('clientes').insert({
          id: newId,
          profile_id: ownerId,
          name: cleanName,
          phone: loan.debtorPhone || null,
          document: loan.debtorDocument || null,
          address: loan.debtorAddress || null,
          access_code: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
          client_number: String(Math.floor(100000 + Math.random() * 900000)),
          notes: 'Gerado automaticamente ao criar contrato',
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        finalClientId = newId;
      }
    }

    const loanId = editingLoan ? loan.id : ensureUUID(loan.id);
    const principal = safeFloat(loan.principal);

    /* =========================
       AJUSTE DE PRINCIPAL (EDIÇÃO)
    ========================= */
    if (editingLoan) {
      const { data: oldLoan } = await supabase
        .from('contratos')
        .select('principal, source_id')
        .eq('id', loanId)
        .single();

      const oldPrincipal = safeFloat(oldLoan?.principal);
      const delta = principal - oldPrincipal;

      if (delta !== 0 && safeUUID(oldLoan?.source_id)) {
        // Ajusta saldo da carteira
        await supabase.rpc('adjust_source_balance', {
          p_source_id: oldLoan.source_id,
          p_delta: -delta
        });

        // Registra no extrato
        await supabase.from('transacoes').insert({
          id: generateUUID(),
          loan_id: loanId,
          profile_id: ownerId,
          source_id: oldLoan.source_id,
          date: new Date().toISOString(),
          type: delta > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
          amount: Math.abs(delta),
          principal_delta: delta,
          interest_delta: 0,
          late_fee_delta: 0,
          category: 'AJUSTE',
          notes: `Ajuste manual do principal (${oldPrincipal} → ${principal})`
        });
      }
    }

    /* =========================
       CONTRATO
    ========================= */
    const loanPayload = {
      id: loanId,
      profile_id: ownerId,
      operador_responsavel_id:
        activeUser.accessLevel === 1 ? null : safeUUID(activeUser.id),
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
      cliente_foto_url: loan.clientAvatarUrl
    };

    if (editingLoan) {
      const { error } = await supabase
        .from('contratos')
        .update(loanPayload)
        .eq('id', loanId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('contratos')
        .insert({ ...loanPayload, created_at: new Date().toISOString() });
      if (error) throw error;

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
  }
};