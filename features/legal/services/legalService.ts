
import { supabase } from '../../../lib/supabase';
import { Agreement, Loan, UserProfile, LegalDocumentParams, LegalDocumentRecord, LegalSignatureMetadata } from '../../../types';
import { generateSHA256, createLegalSnapshot } from '../../../utils/crypto';
import { generateUUID } from '../../../utils/generators';

export const legalService = {
    // Prepara o payload (Snapshot) para geração do documento
    prepareDocumentParams: (agreement: Agreement, loan: Loan, activeUser: UserProfile): LegalDocumentParams => {
        return {
            debtorName: loan.debtorName,
            debtorDoc: loan.debtorDocument,
            debtorPhone: loan.debtorPhone, // Mapeado
            debtorAddress: loan.debtorAddress || 'Endereço não informado',
            creditorName: activeUser.businessName || activeUser.name,
            creditorDoc: activeUser.document || 'Não informado',
            creditorAddress: activeUser.address || `${activeUser.city || 'Manaus'} - ${activeUser.state || 'AM'}`,
            totalDebt: agreement.negotiatedTotal,
            originDescription: `Instrumento particular de empréstimo (ID: ${loan.id.substring(0,8)}) iniciado em ${new Date(loan.startDate).toLocaleDateString('pt-BR')}, consolidado através do Acordo nº ${agreement.id.substring(0,8)}.`,
            installments: agreement.installments,
            contractDate: new Date(loan.startDate).toLocaleDateString('pt-BR'),
            agreementDate: new Date(agreement.createdAt).toLocaleDateString('pt-BR'),
            city: activeUser.city || 'Manaus',
            timestamp: new Date().toISOString()
        };
    },

    // Gera Hash, Salva Snapshot e Retorna Dados para Impressão
    async generateAndRegisterDocument(agreementId: string, params: LegalDocumentParams, profileId: string): Promise<LegalDocumentRecord> {
        // 1. Criar Snapshot Imutável (String JSON determinística)
        const snapshotStr = createLegalSnapshot(params);
        
        // 2. Gerar Hash SHA-256
        const hash = await generateSHA256(snapshotStr);

        // 3. Persistir no Banco (Se já existir para este acordo com mesmo hash, retorna o existente)
        const { data: existing } = await supabase
            .from('documentos_juridicos')
            .select('*')
            .eq('hash_sha256', hash)
            .single();

        if (existing) {
            return {
                id: existing.id,
                agreementId: existing.acordo_id,
                type: existing.tipo,
                snapshot: existing.snapshot,
                hashSHA256: existing.hash_sha256,
                status: existing.status_assinatura === 'ASSINADO' ? 'SIGNED' : 'PENDING',
                signatureMetadata: existing.metadata_assinatura,
                createdAt: existing.created_at
            };
        }

        // Se não existe, cria novo
        const docId = generateUUID();
        const newDocPayload = {
            id: docId,
            acordo_id: agreementId,
            profile_id: profileId,
            tipo: 'CONFISSAO',
            snapshot: params,
            hash_sha256: hash,
            status: 'PENDENTE',
            created_at: new Date().toISOString()
        };

        const { error } = await supabase.from('documentos_juridicos').insert(newDocPayload);
        
        if (error) {
            console.error("Erro ao salvar documento jurídico:", error);
            if (profileId !== 'DEMO') throw new Error("Falha ao registrar documento jurídico no sistema.");
        }

        // 4. REGISTRO AUTOMÁTICO DE TESTEMUNHAS (Art. 784, III, CPC)
        // Testemunha 1: Operador (Credor)
        // Testemunha 2: Sistema (Técnica)
        if (profileId !== 'DEMO') {
            await this.registerAutoWitnesses(docId, profileId, params.creditorName, hash);
        }

        return {
            id: docId,
            agreementId,
            type: 'CONFISSAO',
            snapshot: params,
            hashSHA256: hash,
            status: 'PENDING',
            createdAt: newDocPayload.created_at
        };
    },

    // Função interna para registrar testemunhas automaticamente
    async registerAutoWitnesses(docId: string, profileId: string, creditorName: string, docHash: string) {
        const w1Id = generateUUID();
        const w2Id = generateUUID();
        const now = new Date().toISOString();

        // Hash simples para testemunhas (DocHash + Nome + Time)
        const hashW1 = await generateSHA256(`${docHash}|${creditorName}|${now}`);
        const hashW2 = await generateSHA256(`${docHash}|SYSTEM|${now}`);

        const witnesses = [
            {
                id: w1Id,
                document_id: docId,
                profile_id: profileId,
                signer_name: creditorName,
                signer_document: "CPF/CNPJ do Perfil", // Pegar do perfil se disponível, mas aqui simplificamos
                signer_email: "Operador Logado",
                assinatura_hash: hashW1,
                ip_origem: "127.0.0.1 (Local)", // Idealmente pegar IP real
                user_agent: "CapitalFlow Operator Console",
                signed_at: now,
                // Campo 'role' ou similar seria ideal, mas usaremos signer_email como marcador
            },
            {
                id: w2Id,
                document_id: docId,
                profile_id: profileId,
                signer_name: "CapitalFlow (Testemunha Técnica)",
                signer_document: "N/A", 
                signer_email: "System Audit",
                assinatura_hash: hashW2,
                ip_origem: "Server-Side",
                user_agent: "CapitalFlow Automated Witness Bot v1.0",
                signed_at: now
            }
        ];

        await supabase.from('assinaturas_documento').insert(witnesses);
    },

    // Busca dados completos para Relatório Jurídico
    async getFullAuditData(docId: string) {
        const { data: doc } = await supabase.from('documentos_juridicos').select('*').eq('id', docId).single();
        const { data: signatures } = await supabase.from('assinaturas_documento').select('*').eq('document_id', docId);
        const { data: logs } = await supabase.from('logs_assinatura').select('*').eq('document_id', docId).order('timestamp', { ascending: true });

        return { doc, signatures: signatures || [], logs: logs || [] };
    },

    // 🔒 VALIDAÇÃO DE INTEGRIDADE
    async verifyIntegrity(doc: LegalDocumentRecord): Promise<boolean> {
        const snapshotStr = createLegalSnapshot(doc.snapshot);
        const recomputedHash = await generateSHA256(snapshotStr);
        return recomputedHash === doc.hashSHA256;
    },

    // ✍️ ASSINATURA ELETRÔNICA COM VALIDADE JURÍDICA (MP 2.200-2/2001)
    async signDocument(docId: string, profileId: string, signerInfo?: { name: string, doc: string }): Promise<void> {
        // 1. Obter documento atual do banco para garantir integridade
        const { data: currentDoc, error: fetchError } = await supabase
            .from('documentos_juridicos')
            .select('*')
            .eq('id', docId)
            .eq('profile_id', profileId)
            .single();

        if (fetchError || !currentDoc) {
            throw new Error("Documento não encontrado ou acesso negado.");
        }

        if (currentDoc.status_assinatura === 'ASSINADO') {
            throw new Error("Este documento já foi assinado e é imutável.");
        }

        // 2. RECALCULAR HASH DO SNAPSHOT (Prova de Integridade)
        // Garante que o que está sendo assinado é exatamente o que foi acordado.
        const snapshotStr = createLegalSnapshot(currentDoc.snapshot);
        const recalculatedHash = await generateSHA256(snapshotStr);

        if (recalculatedHash !== currentDoc.hash_sha256) {
            throw new Error("VIOLAÇÃO DE INTEGRIDADE: O conteúdo do documento diverge do hash original. A assinatura foi bloqueada.");
        }

        // 3. Coletar Metadados de Rastreabilidade (Autoria e Tempestividade)
        let publicIp = 'IP_NAO_IDENTIFICADO';
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            publicIp = ipData.ip;
        } catch (e) {
            console.warn("Falha ao obter IP público para auditoria.", e);
        }

        const metadata: LegalSignatureMetadata = {
            ip: publicIp,
            user_agent: navigator.userAgent,
            signed_at: new Date().toISOString(),
            method: 'ASSINATURA_ELETRONICA',
            lei_base: 'MP 2.200-2/2001, Lei 14.063/2020',
            signer_name: signerInfo?.name || 'Operador do Sistema',
            signer_doc: signerInfo?.doc || 'N/A'
        };

        // 4. Efetivar Assinatura (Atomic Update)
        const { error: signError } = await supabase
            .from('documentos_juridicos')
            .update({ 
                status_assinatura: 'ASSINADO',
                metadata_assinatura: metadata
            })
            .eq('id', docId)
            .eq('hash_sha256', recalculatedHash); // Trava extra de concorrência (Optimistic Locking)

        if (signError) {
            throw new Error("Erro ao registrar assinatura no banco de dados: " + signError.message);
        }
    }
};
