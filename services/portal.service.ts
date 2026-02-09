
import { supabase } from '../lib/supabase';

export const portalService = {
  /**
   * Busca um contrato específico pelo TOKEN PÚBLICO com tratamento de erro resiliente.
   */
  async fetchLoanByToken(token: string) {
    if (!token) throw new Error('Token não fornecido.');

    const { data: loan, error } = await supabase
      .from('contratos')
      .select('*, clients:client_id(*), parcelas(*), sinalizacoes_pagamento(*)')
      .eq('portal_token', token)
      .maybeSingle();

    if (error) {
      console.error("Erro técnico ao buscar contrato:", error);
      throw new Error('Erro de conexão com o servidor de dados.');
    }

    if (!loan) {
      throw new Error('Contrato não localizado. O link pode ter expirado ou ser inválido.');
    }

    return loan;
  },

  /**
   * Busca dados básicos do cliente pelo ID (para preencher o header do portal)
   */
  async fetchClientById(clientId: string) {
    const { data, error } = await supabase
        .from('clientes')
        .select('id, name, document, phone')
        .eq('id', clientId)
        .maybeSingle();
    
    if (error) return null;
    return data;
  },

  /**
   * Lista contratos do cliente para dropdown/switcher.
   */
  async fetchClientContracts(clientId: string) {
    const { data, error } = await supabase
      .from('contratos')
      .select('id, created_at, portal_token, client_id, start_date, principal, total_to_receive')
      .eq('client_id', clientId)
      .neq('is_archived', true)
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao listar contratos do cliente:", error);
        return [];
    }
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
      .order('data_vencimento', { ascending: true });

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

    if (error) throw new Error('Falha ao registrar intenção de pagamento.');
    return data?.id;
  },

  /**
   * Busca o documento jurídico mais recente (ativo) para o contrato.
   */
  async getLatestLegalDocument(loanId: string) {
    const { data, error } = await supabase
        .from('documentos_juridicos')
        .select('id, view_token, status, status_assinatura, created_at')
        .eq('loan_id', loanId)
        .neq('status', 'CANCELADO')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (error) {
        console.error("Erro ao buscar docs:", error);
        return null;
    }
    return data;
  }
};
