import { supabase } from '../lib/supabase';

export const portalService = {
  /**
   * Busca um contrato específico pelo TOKEN PÚBLICO.
   * Usado na entrada do portal.
   */
  async fetchLoanByToken(token: string) {
    const { data: loan, error } = await supabase
      .from('contratos')
      .select('*, clients:client_id(*)')
      .eq('portal_token', token)
      .single();

    if (error || !loan) {
      throw new Error('Contrato não encontrado ou link inválido.');
    }

    return loan;
  },

  /**
   * Lista contratos do cliente para dropdown/switcher.
   * (SELECT mínimo para não quebrar quando colunas opcionais não existem no DB)
   */
  async fetchClientContracts(clientId: string) {
    const { data, error } = await supabase
      .from('contratos')
      .select('id, created_at, portal_token')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Falha ao listar contratos.');
    return data || [];
  },

  /**
   * Carrega dados completos do contrato (parcelas, sinais, etc).
   */
  async fetchLoanDetails(loanId: string) {
    const { data: installments, error: instErr } = await supabase
      .from('parcelas')
      .select('*')
      .eq('loan_id', loanId)
      .order('numero_parcela', { ascending: true });

    if (instErr) throw new Error('Erro ao carregar parcelas.');

    let signals: any[] = [];
    try {
      const { data: sig } = await supabase
        .from('sinalizacoes_pagamento')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });
      if (sig) signals = sig;
    } catch {}

    return { installments: installments || [], signals };
  },

  /**
   * Registra intenção de pagamento
   */
  async submitPaymentIntent(clientId: string, loanId: string, profileId: string, tipo: string) {
    try {
      const { data, error } = await supabase.rpc('portal_submit_payment_intent', {
        p_client_id: clientId,
        p_loan_id: loanId,
        p_profile_id: profileId,
        p_tipo: tipo,
      });
      if (error) throw error;
      return data;
    } catch {
      const { data, error } = await supabase
        .from('sinalizacoes_pagamento')
        .insert({
          client_id: clientId,
          loan_id: loanId,
          profile_id: profileId,
          tipo_intencao: tipo,
          status: 'PENDENTE',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw new Error('Falha ao registrar intenção.');
      return data?.id;
    }
  },
};