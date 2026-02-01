
import { supabase } from '../../../lib/supabase';
import { Agreement, Loan, UserProfile, LegalDocumentParams, LegalDocumentRecord } from '../../../types';
import { generateSHA256, createLegalSnapshot } from '../../../utils/crypto';

export const legalService = {
  prepareDocumentParams: (agreement: Agreement, loan: Loan, activeUser: UserProfile): LegalDocumentParams => {
    // Para fins jurídicos, a dívida confessada é o Total a Receber (Principal + Juros Acordados)
    const valorConfessado = agreement.negotiatedTotal || loan.totalToReceive;

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
      totalDebt: valorConfessado,
      originDescription: `Instrumento particular de crédito ID ${loan.id.substring(0, 8)} consolidado via Acordo nº ${agreement.id.substring(0, 8)}. O valor engloba o capital principal e os juros remuneratórios pactuados.`,
      city: activeUser.city || 'Manaus',
      state: activeUser.state || 'AM',
      witnesses: (loan as any).witnesses || [],
      contractDate: new Date(loan.startDate).toLocaleDateString('pt-BR'),
      agreementDate: new Date(agreement.createdAt).toLocaleDateString('pt-BR'),
      installments: agreement.installments,
      timestamp: new Date().toISOString(),
    };
  },

  async generateAndRegisterDocument(entityId: string, params: LegalDocumentParams, profileId: string): Promise<LegalDocumentRecord> {
    const snapshotStr = createLegalSnapshot(params);
    const hash = await generateSHA256(snapshotStr);

    const { data: created, error } = await supabase.rpc('create_documento_juridico_by_loan', {
      p_loan_id: params.loanId,
      p_tipo: 'CONFISSAO',
      p_snapshot: params,
      p_acordo_id: entityId === params.loanId ? null : entityId
    });

    if (error) throw new Error(`Falha na base de dados: ${error.message}`);
    
    const row = Array.isArray(created) ? created[0] : created;

    return {
      id: row.id,
      agreementId: row.acordo_id ?? entityId,
      type: 'CONFISSAO',
      snapshot: params,
      hashSHA256: row.hash_sha256,
      status: row.status_assinatura === 'ASSINADO' ? 'SIGNED' : 'PENDING',
      public_access_token: row.view_token,
      createdAt: row.created_at
    };
  },

  async getFullAuditData(docId: string) {
    const { data: doc } = await supabase.from('documentos_juridicos').select('*').eq('id', docId).single();
    if (!doc) return { doc: null, signatures: [] };
    const { data: signatures } = await supabase.from('assinaturas_documento').select('*').eq('document_id', doc.id).order('signed_at', { ascending: true });
    return { doc, signatures: signatures || [] };
  },

  async signDocument(docId: string, profileId: string, signerInfo: { name: string; doc: string }, role: string): Promise<void> {
    let ip = '0.0.0.0';
    try { const res = await fetch('https://api.ipify.org?format=json'); const d = await res.json(); ip = d.ip; } catch {}
    const timestamp = new Date().toISOString();
    const payload = `${docId}|${signerInfo.doc}|${role}|${timestamp}`;
    const hash = await generateSHA256(payload);

    const { error: signError } = await supabase.from('assinaturas_documento').insert({
      document_id: docId,
      profile_id: profileId,
      signer_name: signerInfo.name.toUpperCase(),
      signer_document: signerInfo.doc,
      role: role, // CREDOR, DEVEDOR, TESTEMUNHA_1, TESTEMUNHA_2
      assinatura_hash: hash,
      ip_origem: ip,
      user_agent: navigator.userAgent,
      signed_at: timestamp,
    });

    if (signError) throw signError;
    await supabase.from('documentos_juridicos').update({ status_assinatura: 'EM_ASSINATURA' }).eq('id', docId);
  },
};
