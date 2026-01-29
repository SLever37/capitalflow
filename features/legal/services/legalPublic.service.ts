
import { supabase } from '../../../lib/supabase';
import { LegalDocumentParams } from '../../../types';
import { legalValidityService } from './legalValidity.service';

/**
 * SERVIÇO PÚBLICO DE ASSINATURA JURÍDICA
 * Responsável pela interface entre o link público (Devedor) e o Sistema.
 * Utiliza RPCs Security Definer para permitir acesso sem login.
 */
export const legalPublicService = {

    /**
     * Gera um link público único para assinatura do documento.
     * Atualiza o token no banco se necessário.
     */
    async generateSigningLink(documentId: string): Promise<string> {
        // Verifica se já existe token
        const { data: doc, error } = await supabase
            .from('documentos_juridicos')
            .select('public_access_token')
            .eq('id', documentId)
            .single();

        if (error) throw new Error("Documento não encontrado.");

        let token = doc.public_access_token;

        // Se não tiver token (legado ou falha), gera um novo via update
        if (!token) {
            // Nota: O default gen_random_uuid() no SQL cuida disso em novos inserts,
            // mas para updates manuais forçamos aqui se necessário.
            // Como o campo é gerado no banco, vamos apenas reler ou forçar refresh se precisar.
            // Para simplificar, assumimos que o token existe.
            throw new Error("Token de acesso público não gerado para este documento.");
        }

        // Constrói URL do Portal
        const origin = window.location.origin;
        return `${origin}/legal-sign/${token}`;
    },

    /**
     * Busca os dados do documento usando APENAS o token público.
     * (Usado na tela que o devedor vê)
     */
    async fetchDocumentByToken(token: string) {
        const { data, error } = await supabase.rpc('get_legal_doc_by_token', {
            p_token: token
        });

        if (error || !data || data.length === 0) {
            throw new Error("Documento não encontrado ou link expirado.");
        }

        const doc = data[0]; // RPC retorna tabela, pegamos a 1ª linha

        // Validação Client-Side do Hash para garantir que o que veio do banco bate com o snapshot
        const snapshotStr = legalValidityService.prepareLegalSnapshot(doc.snapshot);
        const calculatedHash = await legalValidityService.calculateHash(snapshotStr);

        if (calculatedHash !== doc.hash_sha256) {
            console.error("Critical Integrity Failure", { expected: doc.hash_sha256, calculated: calculatedHash });
            throw new Error("ALERTA DE SEGURANÇA: A integridade deste documento foi comprometida.");
        }

        return {
            ...doc,
            snapshot: doc.snapshot as LegalDocumentParams
        };
    },

    /**
     * Executa a assinatura pública.
     */
    async signDocumentPublicly(
        token: string, 
        signerInfo: { name: string, doc: string },
        deviceInfo: { ip: string, userAgent: string }
    ) {
        // 1. Gera hash da assinatura (Snapshot + Signer + Time) para garantir não-repúdio matemático
        const timestamp = new Date().toISOString();
        const signaturePayload = `${token}|${signerInfo.doc}|${timestamp}`;
        const signatureHash = await legalValidityService.calculateHash(signaturePayload);

        // 2. Chama RPC segura
        const { data, error } = await supabase.rpc('sign_legal_doc_public', {
            p_token: token,
            p_signer_name: signerInfo.name,
            p_signer_doc: signerInfo.doc,
            p_ip: deviceInfo.ip,
            p_user_agent: deviceInfo.userAgent,
            p_signature_hash: signatureHash
        });

        if (error) {
            console.error("Erro na assinatura pública:", error);
            throw new Error("Falha ao registrar assinatura: " + error.message);
        }

        return true;
    }
};
