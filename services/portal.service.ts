
import { supabase } from '../lib/supabase';
import { mapLoanFromDB } from './adapters/loanAdapter';

export const portalService = {
  /**
   * Busca um contrato específico pelo TOKEN PÚBLICO.
   * Usado na entrada do portal.
   * Utiliza RPC para bypass seguro do RLS.
   */
  async fetchLoanByToken(token: string) {
    const { data: loanRaw, error } = await supabase
      .rpc('get_loan_by_portal_token', { p_token: token });

    if (error || !loanRaw || loanRaw.length === 0) {
      console.error("Portal Fetch Error:", error);
      throw new Error('Contrato não encontrado ou link inválido.');
    }

    // O RPC retorna um array (função table), pegamos o primeiro
    const loanData = loanRaw[0];
    
    // Mapeamento para o formato interno do App
    // O RPC já traz as parcelas embutidas no campo 'installments' (JSONB)
    return mapLoanFromDB(loanData, loanData.installments || []);
  },

  /**
   * Busca dados básicos do cliente pelo ID.
   * Tenta buscar direto, mas retorna null silenciosamente se falhar por RLS.
   * O Hook de lógica tem fallback para usar os dados do contrato.
   */
  async fetchClientById(clientId: string) {
    // Tenta buscar (pode falhar por RLS se for anon)
    const { data, error } = await supabase
        .from('clientes')
        .select('id, name, document, phone, email')
        .eq('id', clientId)
        .single();
    
    if (error) return null;
    return data;
  },

  /**
   * Lista contratos do cliente para dropdown/switcher.
   * Utiliza RPC que valida se o token pertence ao cliente.
   */
  async fetchClientContracts(clientId: string, currentToken: string) {
    // Usa RPC para garantir que quem tem o token pode ver os contratos do mesmo cliente
    const { data, error } = await supabase
      .rpc('get_portal_contracts_by_token', { p_token: currentToken });

    if (error) throw new Error('Falha ao listar contratos.');
    return data || [];
  },

  /**
   * Registra intenção de pagamento
   */
  async submitPaymentIntent(clientId: string, loanId: string, profileId: string, tipo: string) {
    const { data, error } = await supabase.rpc('portal_submit_payment_intent', {
      p_client_id: clientId,
      p_loan_id: loanId,
      p_profile_id: profileId,
      p_tipo: tipo,
    });
    
    if (error) throw error;
    return data;
  },
};
