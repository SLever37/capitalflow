
import { supabase } from '../lib/supabase';
import { Loan } from '../types';
import { mapLoanFromDB } from './adapters/loanAdapter';

export const portalService = {
  /**
   * Busca um contrato específico pelo TOKEN PÚBLICO.
   * Usado na entrada do portal.
   */
  async fetchLoanByToken(token: string) {
    const { data: loan, error } = await supabase
      .from('contratos')
      .select('*, clients:client_id(*)') // Join para pegar dados básicos do cliente se necessário
      .eq('portal_token', token)
      .single();

    if (error || !loan) {
      throw new Error('Contrato não encontrado ou link inválido.');
    }

    return loan;
  },

  /**
   * Lista todos os contratos do cliente para o dropdown/switcher.
   * Retorna apenas dados essenciais para navegação.
   */
  async fetchClientContracts(clientId: string) {
    const { data, error } = await supabase
      .from('contratos')
      .select('id, code, start_date, created_at, portal_token, principal, total_to_receive')
      .eq('client_id', clientId)
      .eq('is_archived', false) // Opcional: mostrar ou não arquivados no portal
      .order('created_at', { ascending: false });

    if (error) throw new Error('Falha ao listar contratos.');
    return data || [];
  },

  /**
   * Carrega dados completos do contrato (parcelas, sinais, etc).
   * Reutiliza a lógica de mapping existente.
   */
  async fetchLoanDetails(loanId: string) {
    // 1) Parcelas
    const { data: installments, error: instErr } = await supabase
      .from('parcelas')
      .select('*')
      .eq('loan_id', loanId)
      .order('numero_parcela', { ascending: true });

    if (instErr) throw new Error('Erro ao carregar parcelas.');

    // 2) Sinais / Comprovantes
    let signals: any[] = [];
    try {
      const { data: sig } = await supabase
        .from('sinalizacoes_pagamento')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });
      if (sig) signals = sig;
    } catch {}

    return {
      installments: installments || [],
      signals
    };
  },

  /**
   * Registra intenção de pagamento
   */
  async submitPaymentIntent(clientId: string, loanId: string, profileId: string, tipo: string) {
    // Tenta via RPC primeiro (mais seguro/atômico)
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
      // Fallback manual
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
  }
};
