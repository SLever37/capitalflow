// src/features/legal/services/legalPublic.service.ts
import { supabase } from '../../../lib/supabase';
import { LegalDocumentParams } from '../../../types';
import { legalValidityService } from './legalValidity.service';

export const legalPublicService = {
  async generateSigningLink(documentId: string): Promise<string> {
    // Uso administrativo (Operador autenticado)
    const { data: doc, error } = await supabase
      .from('documentos_juridicos')
      .select('view_token')
      .eq('id', documentId)
      .single();

    if (error || !doc?.view_token) throw new Error('Documento não encontrado.');
    return `${window.location.origin}/?legal_sign=${doc.view_token}`;
  },

  async fetchDocumentByToken(token: string) {
    // Portal público: consulta por view_token
    const { data, error } = await supabase
      .from('documentos_juridicos')
      .select('*')
      .eq('view_token', token)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.error('Fetch Token Error:', error);
      throw new Error('Título não localizado ou link expirado.');
    }

    const doc: any = data;
    return {
      ...doc,
      snapshot: (doc.snapshot || doc.content_snapshot) as LegalDocumentParams,
    };
  },

  async getAuditByToken(token: string) {
    const { data: doc, error } = await supabase
      .from('documentos_juridicos')
      .select('id')
      .eq('view_token', token)
      .limit(1)
      .maybeSingle();

    if (error || !doc?.id) return { signatures: [] };

    const { data: signatures, error: sigErr } = await supabase
      .from('assinaturas_documento')
      .select('*')
      .eq('document_id', doc.id);

    if (sigErr) return { signatures: [] };
    return { signatures: signatures || [] };
  },

  async signDocumentPublicly(
    token: string,
    signerInfo: { name: string; doc: string; role: string },
    deviceInfo: { ip: string; userAgent: string }
  ) {
    const timestamp = new Date().toISOString();
    const signaturePayload = `${token}|${signerInfo.doc}|${signerInfo.role}|${timestamp}`;
    const signatureHash = await legalValidityService.calculateHash(signaturePayload);

    // ✅ Agora assina via RPC (security definer) — sem UPDATE direto no portal
    const { data, error } = await supabase.rpc('portal_sign_document_by_view_token', {
      p_view_token: token,
      p_signer_name: signerInfo.name,
      p_signer_document: signerInfo.doc,
      p_role: signerInfo.role,
      p_assinatura_hash: signatureHash,
      p_ip_origem: deviceInfo.ip,
      p_user_agent: deviceInfo.userAgent,
      p_signed_at: timestamp,
    });

    if (error) {
      throw new Error(error.message || 'Falha ao assinar documento.');
    }

    // data vem como jsonb { ok: true, ... }
    if (data?.ok !== true) {
      throw new Error('Falha ao assinar documento.');
    }

    return true;
  },
};