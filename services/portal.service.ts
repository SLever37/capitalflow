
import { supabasePortal } from '../lib/supabasePortal';

export const portalService = {
  /**
   * Busca um contrato específico pelo TOKEN PÚBLICO.
   * Usado na entrada do portal.
   */
  async fetchLoanByToken(token: string) {
    // Usa RPC para garantir acesso ANON via token
    const { data, error } = await supabasePortal
      .rpc('portal_find_by_token', { p_token: token })
      .single();

    if (error || !data) {
      throw new Error('Contrato não encontrado ou link inválido.');
    }

    return data;
  },

  /**
   * Busca dados básicos do cliente pelo ID (para preencher o header do portal)
   */
  async fetchClientById(clientId: string) {
    const { data, error } = await supabasePortal
        .rpc('portal_get_client', { p_client_id: clientId })
        .single();
    
    if (error) return null;
    return data;
  },

  /**
   * Lista contratos do cliente para dropdown/switcher.
   * CORREÇÃO: Incluído client_id e code na seleção para validação de segurança no frontend.
   */
  async fetchClientContracts(clientId: string) {
    const { data, error } = await supabasePortal
      .rpc('portal_list_contracts', { p_client_id: clientId });

    if (error) throw new Error('Falha ao listar contratos.');
    return data || [];
  },

  /**
   * Carrega dados completos do contrato (parcelas, sinais, etc).
   */
  async fetchLoanDetails(loanId: string) {
    const { data: installments, error: instErr } = await supabasePortal
      .rpc('portal_get_parcels', { p_loan_id: loanId });

    if (instErr) throw new Error('Erro ao carregar parcelas.');

    let signals: any[] = [];
    try {
      const { data: sig } = await supabasePortal
        .rpc('portal_get_signals', { p_loan_id: loanId });
      if (sig) signals = sig;
    } catch {}

    return { installments: installments || [], signals };
  },

  /**
   * Busca o contrato completo com parcelas e sinalizações.
   * Substitui a chamada direta ao supabase no hook.
   */
  async fetchFullLoanById(loanId: string) {
    // RPC retorna JSON completo
    const { data: fullLoanData, error } = await supabasePortal
      .rpc('portal_get_full_loan', { p_loan_id: loanId });

    if (error) return null;
    return fullLoanData;
  },

  /**
   * Registra intenção de pagamento
   */
  async submitPaymentIntent(clientId: string, loanId: string, profileId: string, tipo: string) {
    try {
      const { data, error } = await supabasePortal.rpc('portal_submit_payment_intent', {
        p_client_id: clientId,
        p_loan_id: loanId,
        p_profile_id: profileId,
        p_tipo: tipo,
      });
      if (error) throw error;
      return data;
    } catch {
      const { data, error } = await supabasePortal
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
