
import { supabase } from '../../../lib/supabase';
import { LegalDocumentParams } from '../../../types';
import { legalValidityService } from './legalValidity.service';

export const legalPublicService = {
    async generateSigningLink(documentId: string): Promise<string> {
        // Uso administrativo (Operador autenticado)
        const { data: doc, error } = await supabase
            .from('documentos_juridicos')
            .select('view_token') // CORREÇÃO: Coluna correta do banco
            .eq('id', documentId)
            .single();
            
        if (error) throw new Error("Documento não encontrado.");
        return `${window.location.origin}/?legal_sign=${doc.view_token}`;
    },

    async fetchDocumentByToken(token: string) {
        // CORREÇÃO: Consulta direta por view_token (coluna pública)
        const { data, error } = await supabase
            .from('documentos_juridicos')
            .select('*')
            .eq('view_token', token)
            .limit(1)
            .maybeSingle();
        
        if (error || !data) {
            console.error("Fetch Token Error:", error);
            throw new Error("Título não localizado ou link expirado.");
        }
        
        const doc = data;
        // Normaliza campos do banco (snake_case) para o objeto de contrato (camelCase) se necessário
        return { 
            ...doc, 
            snapshot: (doc.snapshot || doc.content_snapshot) as LegalDocumentParams 
        };
    },

    async getAuditByToken(token: string) {
        // Busca ID via view_token
        const { data: doc, error } = await supabase
            .from('documentos_juridicos')
            .select('id')
            .eq('view_token', token)
            .limit(1)
            .maybeSingle();

        if (error || !doc) return { signatures: [] };
        
        const { data: signatures } = await supabase.from('assinaturas_documento').select('*').eq('document_id', doc.id);
        return { signatures: signatures || [] };
    },

    async signDocumentPublicly(
        token: string, 
        signerInfo: { name: string, doc: string, role: string },
        deviceInfo: { ip: string, userAgent: string }
    ) {
        const timestamp = new Date().toISOString();
        const signaturePayload = `${token}|${signerInfo.doc}|${signerInfo.role}|${timestamp}`;
        const signatureHash = await legalValidityService.calculateHash(signaturePayload);

        // Busca ID e Profile via view_token
        const { data: docRecord, error: fetchError } = await supabase
            .from('documentos_juridicos')
            .select('*')
            .eq('view_token', token)
            .limit(1)
            .maybeSingle();
        
        if (fetchError || !docRecord) throw new Error("Documento inválido ou acesso negado.");

        // Se documento já assinado, bloqueia nova tentativa
        if (docRecord.status_assinatura === 'ASSINADO') {
            throw new Error("Este documento já foi assinado e encontra-se selado.");
        }

        const { error } = await supabase.from('assinaturas_documento').insert({
            document_id: docRecord.id,
            profile_id: docRecord.profile_id,
            signer_name: signerInfo.name.toUpperCase(),
            signer_document: signerInfo.doc,
            role: signerInfo.role,
            assinatura_hash: signatureHash,
            ip_origem: deviceInfo.ip,
            user_agent: deviceInfo.userAgent,
            signed_at: timestamp
        });

        if (error) throw new Error("Falha ao registrar assinatura: " + error.message);

        // Atualização de status via RLS (O trigger do banco garantirá a imutabilidade se for 'SIGNED')
        if (signerInfo.role === 'DEVEDOR') {
            await supabase.from('documentos_juridicos').update({ 
                status_assinatura: 'ASSINADO',
                updated_at: timestamp 
            }).eq('id', docRecord.id);
        }

        return true;
    }
};
