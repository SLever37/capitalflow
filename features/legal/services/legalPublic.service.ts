// src/features/legal/services/legalPublic.service.ts
import { supabase } from '../../../lib/supabase';
import { LegalDocumentParams } from '../../../types';
import { legalValidityService } from './legalValidity.service';
import { safeUUID } from '../../../utils/uuid';

export const legalPublicService = {
  /**
   * Gera link público de assinatura (uso administrativo)
   * ⚠️ NÃO acessa tabela direto — usa RPC
   */
  async generateSigningLink(documentId: string): Promise<string> {
    const safeDocId = safeUUID(documentId);
    if (!safeDocId) throw new Error('ID do documento inválido');

    const { data, error } = await supabase
      .rpc('get_documento_juridico_by_id', { p_document_id: safeDocId });

    if (error || !data || data.length === 0) {
      throw new Error('Documento não encontrado.');
    }

    return `${window.location.origin}/?legal_sign=${data[0].view_token}`;
  },

  /**
   * Busca documento público pelo token
   * ✅ via RPC SECURITY DEFINER
   */
  async fetchDocumentByToken(token: string) {
    const { data, error } = await supabase
      .rpc('get_documento_juridico_by_view_token', {
        p_view_token: token,
      });

    if (error || !data || data.length === 0) {
      console.error('RPC fetchDocumentByToken error:', error);
      throw new Error('Título não localizado ou link inválido.');
    }

    const doc = data[0];

    return {
      ...doc,
      snapshot: doc.snapshot as LegalDocumentParams,
    };
  },

  /**
   * Auditoria pública (somente leitura)
   */
  async getAuditByToken(token: string) {
    const { data, error } = await supabase
      .rpc('get_documento_juridico_by_view_token', {
        p_view_token: token,
      });

    if (error || !data || data.length === 0) {
      return { signatures: [] };
    }

    const docId = data[0].id;
    const safeDocId = safeUUID(docId);
    if (!safeDocId) return { signatures: [] };

    const { data: signatures } = await supabase
      .from('assinaturas_documento')
      .select('*')
      .eq('document_id', safeDocId);

    return { signatures: signatures || [] };
  },

  /**
   * Assinatura pública (DEVEDOR)
   * ✅ leitura via RPC
   * ❌ nenhuma query direta em documentos_juridicos
   */
  async signDocumentPublicly(
    token: string,
    signerInfo: { name: string; doc: string; role: string },
    deviceInfo: { ip: string; userAgent: string }
  ) {
    const { data, error } = await supabase
      .rpc('get_documento_juridico_by_view_token', {
        p_view_token: token,
      });

    if (error || !data || data.length === 0) {
      throw new Error('Documento inválido ou acesso negado.');
    }

    const doc = data[0];
    const safeDocId = safeUUID(doc.id);
    if (!safeDocId) throw new Error('ID do documento inválido');

    if (doc.status_assinatura === 'ASSINADO') {
      throw new Error('Documento já assinado.');
    }

    const timestamp = new Date().toISOString();
    const signaturePayload = `${token}|${signerInfo.doc}|${signerInfo.role}|${timestamp}`;
    const signatureHash = await legalValidityService.calculateHash(signaturePayload);

    const { error: insertError } = await supabase
      .from('assinaturas_documento')
      .insert({
        document_id: safeDocId,
        profile_id: doc.profile_id,
        signer_name: signerInfo.name.toUpperCase(),
        signer_document: signerInfo.doc,
        role: signerInfo.role,
        assinatura_hash: signatureHash,
        ip_origem: deviceInfo.ip,
        user_agent: deviceInfo.userAgent,
        signed_at: timestamp,
      });

    if (insertError) {
      throw new Error('Falha ao registrar assinatura.');
    }

    await supabase
      .from('documentos_juridicos')
      .update({
        status_assinatura: 'ASSINADO',
        updated_at: timestamp,
      })
      .eq('id', safeDocId);

    return true;
  },
};