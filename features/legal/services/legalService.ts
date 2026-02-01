
import { supabase } from '../../../lib/supabase';
import { Agreement, Loan, UserProfile, LegalDocumentParams, LegalDocumentRecord } from '../../../types';
import { generateSHA256, createLegalSnapshot } from '../../../utils/crypto';
import { generateUUID } from '../../../utils/generators';

export const legalService = {
    prepareDocumentParams: (agreement: Agreement, loan: Loan, activeUser: UserProfile): LegalDocumentParams => {
        return {
            loanId: loan.id,
            debtorName: loan.debtorName,
            debtorDoc: loan.debtorDocument,
            debtorPhone: loan.debtorPhone, 
            debtorAddress: loan.debtorAddress || 'Endereço não informado',
            creditorName: activeUser.fullName || activeUser.businessName || activeUser.name,
            creditorDoc: activeUser.document || 'Não informado',
            creditorAddress: activeUser.address || `${activeUser.city || 'Manaus'} - ${activeUser.state || 'AM'}`,
            amount: loan.principal,
            totalDebt: agreement.negotiatedTotal,
            originDescription: `Instrumento particular de crédito privado ID ${loan.id.substring(0,8)} consolidado via Acordo nº ${agreement.id.substring(0,8)}.`,
            city: activeUser.city || 'Manaus',
            state: activeUser.state || 'AM',
            witnesses: (loan as any).witnesses || [], 
            contractDate: new Date(loan.startDate).toLocaleDateString('pt-BR'),
            agreementDate: new Date(agreement.createdAt).toLocaleDateString('pt-BR'),
            installments: agreement.installments,
            timestamp: new Date().toISOString()
        };
    },

    async generateAndRegisterDocument(entityId: string, params: LegalDocumentParams, profileId: string): Promise<LegalDocumentRecord> {
        const snapshotStr = createLegalSnapshot(params);
        const hash = await generateSHA256(snapshotStr);

        // Busca verificando integridade usando o nome de coluna correto: hash_sha256
        const { data: existing, error: fetchError } = await supabase
            .from('documentos_juridicos')
            .select('*')
            .eq('hash_sha256', hash)
            .maybeSingle();

        if (existing) {
            return {
                id: existing.id,
                agreementId: existing.acordo_id,
                type: existing.tipo,
                snapshot: existing.snapshot,
                hashSHA256: existing.hash_sha256,
                status: existing.status_assinatura === 'ASSINADO' ? 'SIGNED' : 'PENDING',
                public_access_token: existing.public_access_token,
                createdAt: existing.created_at
            };
        }

        const docId = generateUUID();
        const newDocPayload = {
            id: docId,
            loan_id: params.loanId,
            acordo_id: entityId === params.loanId ? null : entityId,
            profile_id: profileId,
            tipo: 'CONFISSAO',
            snapshot: params,
            hash_sha256: hash,
            status_assinatura: 'PENDENTE',
            public_access_token: generateUUID(),
            created_at: new Date().toISOString()
        };

        const { error } = await supabase.from('documentos_juridicos').insert(newDocPayload);
        
        if (error) {
            console.error("Erro Supabase (Documento):", error);
            throw new Error(`Falha na base de dados: ${error.message}`);
        }

        return {
            id: docId,
            agreementId: entityId,
            type: 'CONFISSAO',
            snapshot: params,
            hashSHA256: hash,
            status: 'PENDING',
            public_access_token: newDocPayload.public_access_token,
            createdAt: newDocPayload.created_at
        };
    },

    async getFullAuditData(docId: string) {
        const { data: doc, error: docError } = await supabase.from('documentos_juridicos').select('*').eq('id', docId).single();
        if (docError || !doc) return { doc: null, signatures: [] };
        const { data: signatures } = await supabase.from('assinaturas_documento').select('*').eq('document_id', doc.id);
        return { doc, signatures: signatures || [] };
    },

    async signDocument(docId: string, profileId: string, signerInfo: { name: string, doc: string }, role: string): Promise<void> {
        let ip = '0.0.0.0';
        try { const res = await fetch('https://api.ipify.org?format=json'); const d = await res.json(); ip = d.ip; } catch (e) {}

        const timestamp = new Date().toISOString();
        const payload = `${docId}|${signerInfo.doc}|${role}|${timestamp}`;
        const hash = await generateSHA256(payload);

        const { error: signError } = await supabase.from('assinaturas_documento').insert({
            id: generateUUID(),
            document_id: docId,
            profile_id: profileId,
            signer_name: signerInfo.name.toUpperCase(),
            signer_document: signerInfo.doc,
            role: role,
            assinatura_hash: hash,
            ip_origem: ip,
            user_agent: navigator.userAgent,
            signed_at: timestamp
        });

        if (signError) {
            console.error("Erro Supabase (Assinatura):", signError);
            throw signError;
        }
        
        // Atualiza status do documento
        await supabase.from('documentos_juridicos').update({ status_assinatura: 'EM_ASSINATURA' }).eq('id', docId);
    }
};
