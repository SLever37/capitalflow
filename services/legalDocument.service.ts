// src/services/legalDocument.service.ts
import { supabasePortal } from '../lib/supabasePortal';

type PortalDocListItem = {
  id: string;
  tipo: string;
  status_assinatura: string;
  created_at: string;
};

type PortalDoc = {
  id: string;
  tipo: string;
  status_assinatura: string;
  snapshot?: any;
  snapshot_rendered_html?: string | null;
  [key: string]: any;
};

export const legalDocumentService = {
  /**
   * Lista documentos disponíveis para o token do portal
   * RPC: portal_list_docs(p_token uuid) -> TABLE(id uuid, tipo text, status_assinatura text, created_at timestamptz)
   */
  async listDocs(token: string): Promise<PortalDocListItem[]> {
    const { data, error } = await supabasePortal.rpc('portal_list_docs', {
      p_token: token,
    });

    if (error) throw new Error(error.message || 'Falha ao listar documentos.');
    return (data ?? []) as PortalDocListItem[];
  },

  /**
   * Busca um documento específico (HTML renderizado + snapshot)
   * RPC: portal_get_doc(p_token uuid, p_doc_id uuid) -> jsonb
   */
  async getDoc(token: string, docId: string): Promise<PortalDoc> {
    const { data, error } = await supabasePortal
      .rpc('portal_get_doc', { p_token: token, p_doc_id: docId })
      .single();

    if (error) throw new Error(error.message || 'Falha ao buscar documento.');
    if (!data) throw new Error('Documento não encontrado.');

    return {
      id: data.id,
      tipo: data.tipo,
      status_assinatura: data.status_assinatura,
      snapshot: data.snapshot,
      snapshot_rendered_html:
        data.snapshot_rendered_html ?? data.rendered_html ?? null,
      ...data,
    };
  },

  /**
   * Verifica campos faltantes antes de assinar
   * RPC: rpc_doc_missing_fields(p_documento_id uuid) -> json
   */
  async missingFields(docId: string) {
    const { data, error } = await supabasePortal.rpc('rpc_doc_missing_fields', {
      p_documento_id: docId,
    });

    if (error) throw new Error(error.message || 'Falha ao validar campos.');
    const payload = Array.isArray(data) ? data[0] : data;
    return payload;
  },

  /**
   * Atualiza campos faltantes (NÃO IMPLEMENTADO AINDA)
   * Motivo: você tem trigger de imutabilidade e não vimos RPC segura para patch do snapshot.
   * Crie uma RPC SECURITY DEFINER do tipo: rpc_doc_patch_snapshot(p_documento_id uuid, p_patch jsonb)
   * com validação de dono e status=PENDENTE.
   */
  async updateFields(_docId: string, _fields: any) {
    throw new Error(
      'updateFields ainda não foi habilitado: falta RPC segura para patch do snapshot.'
    );
  },

  /**
   * Assina o documento (Portal)
   * RPC recomendada (já existe no seu banco):
   * portal_sign_document(p_token uuid, p_documento_id uuid, p_papel text, p_nome text, p_cpf text, p_email text, p_phone text, p_ip text, p_user_agent text, p_hash_assinado text) -> json
   */
  async signDoc(payload: {
    token: string;
    docId: string;
    role: string;
    name: string;
    cpf: string;
    ip: string;
    userAgent: string;
    email?: string | null;
    phone?: string | null;
    assinaturaHash?: string | null;
  }) {
    const { data, error } = await supabasePortal.rpc('portal_sign_document', {
      p_token: payload.token,
      p_documento_id: payload.docId,
      p_papel: payload.role,
      p_nome: payload.name,
      p_cpf: payload.cpf,
      p_email: payload.email ?? null,
      p_phone: payload.phone ?? null,
      p_ip: payload.ip,
      p_user_agent: payload.userAgent,
      p_hash_assinado: payload.assinaturaHash ?? null,
    });

    if (error) throw new Error(error.message || 'Falha ao assinar documento.');
    const out = Array.isArray(data) ? data[0] : data;
    return out ?? { ok: true };
  },
};