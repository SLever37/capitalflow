
import { supabasePortal } from '../lib/supabasePortal';
import { safeUUID } from '../utils/uuid';

export const portalService = {
  /**
   * Marca o portal como visualizado (registro de log/acesso)
   */
  async markViewed(token: string, code: string) {
    if (!token || !code) return;
    try {
      await supabasePortal.rpc('portal_mark_viewed', { 
        p_token: token, 
        p_shortcode: code 
      });
    } catch (e) {
      console.warn('Falha ao registrar visualização:', e);
    }
  },

  /**
   * Busca dados básicos do cliente usando as credenciais do portal.
   */
  async fetchClientByPortal(token: string, code: string) {
    const { data, error } = await supabasePortal
        .rpc('portal_get_client', { p_token: token, p_shortcode: code })
        .single();
    
    if (error || !data) return null;
    return (data as any).portal_get_client || data;
  },

  /**
   * Lista contratos do cliente usando as credenciais do portal.
   */
  async fetchClientContractsByPortal(token: string, code: string) {
    const { data, error } = await supabasePortal
      .rpc('portal_list_contracts', { p_token: token, p_shortcode: code });

    if (error) throw new Error('Falha ao listar contratos.');
    return data || [];
  },

  /**
   * Carrega dados completos do contrato (parcelas, sinais, etc) usando credenciais do portal.
   */
  async fetchLoanDetailsByPortal(token: string, code: string) {
    const { data: installments, error: instErr } = await supabasePortal
      .rpc('portal_get_parcels', { p_token: token, p_shortcode: code });

    if (instErr) throw new Error('Erro ao carregar parcelas.');

    let signals: any[] = [];
    try {
      const { data: sig } = await supabasePortal
        .rpc('portal_get_signals', { p_token: token, p_shortcode: code });
      if (sig) signals = sig;
    } catch {}

    return { installments: installments || [], signals };
  },

  /**
   * Busca o contrato completo com parcelas e sinalizações usando credenciais do portal.
   */
  async fetchFullLoanByPortal(token: string, code: string) {
    // RPC retorna JSON completo
    const { data, error } = await supabasePortal
      .rpc('portal_get_full_loan', { p_token: token, p_shortcode: code })
      .single();

    if (error || !data) return null;
    return (data as any).portal_get_full_loan || data;
  },

  /**
   * Registra intenção de pagamento via portal_token
   */
  async submitPaymentIntentByPortalToken(token: string, code: string, tipo: string, comprovanteUrl?: string | null) {
    if (!token || !code) throw new Error('Credenciais do portal incompletas.');
    
    const { data, error } = await supabasePortal.rpc('portal_registrar_intencao', {
      p_token: token,
      p_shortcode: code,
      p_tipo: tipo,
      p_comprovante_url: comprovanteUrl ?? null
    });

    if (error) throw new Error(error.message || 'Falha ao registrar intenção.');
    return data;
  },

  /**
   * Lista documentos disponíveis para o token atual
   */
  async listDocuments(token: string, code: string) {
    const { data, error } = await supabasePortal
      .rpc('portal_list_docs', { p_token: token, p_shortcode: code });

    if (error) throw new Error('Falha ao listar documentos.');
    return data || [];
  },

  /**
   * Busca o conteúdo HTML de um documento específico
   */
  async fetchDocument(token: string, code: string, docId: string) {
    const safeDocId = safeUUID(docId);
    if (!safeDocId) throw new Error('ID do documento inválido.');

    const { data, error } = await supabasePortal
      .rpc('portal_get_doc', { p_token: token, p_shortcode: code, p_doc_id: safeDocId })
      .single();

    if (error || !data) throw new Error('Falha ao carregar documento.');
    return (data as any).portal_get_doc || data;
  },

  /**
   * Verifica campos faltantes para assinatura
   */
  async docMissingFields(docId: string) {
    const safeDocId = safeUUID(docId);
    if (!safeDocId) throw new Error('ID do documento inválido.');

    const { data, error } = await supabasePortal
      .rpc('rpc_doc_missing_fields', { p_documento_id: safeDocId })
      .single();

    if (error) throw new Error('Erro ao verificar campos.');
    return data; // { missing: string[], can_sign: boolean }
  },

  /**
   * Atualiza campos faltantes no snapshot do documento
   */
  async updateDocumentSnapshotFields(docId: string, patch: any) {
    const safeDocId = safeUUID(docId);
    if (!safeDocId) throw new Error('ID do documento inválido.');

    const { data, error } = await supabasePortal
      .rpc('rpc_doc_patch_snapshot', { p_documento_id: safeDocId, p_patch: patch });
    
    if (error) throw error;
    return data;
  },

  /**
   * Assina o documento
   */
  async signDocument(token: string, code: string, docId: string, role: string, name: string, cpf: string, ip: string, userAgent: string) {
    const safeDocId = safeUUID(docId);
    if (!safeDocId) throw new Error('ID do documento inválido.');

    const { data, error } = await supabasePortal
      .rpc('portal_sign_document', {
        p_token: token,
        p_shortcode: code,
        p_documento_id: safeDocId,
        p_papel: role,
        p_nome: name,
        p_cpf: cpf,
        p_ip: ip,
        p_user_agent: userAgent
      });

    if (error) throw new Error('Erro ao assinar documento: ' + error.message);
    return data;
  }
};
