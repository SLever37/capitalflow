import { supabase } from '../../../lib/supabase';
import { Agreement, Loan, UserProfile, LegalDocumentParams, LegalDocumentRecord } from '../../../types';
import { generateSHA256, createLegalSnapshot } from '../../../utils/crypto';

type RpcCreateDocRow = {
  id: string;
  acordo_id: string | null;
  tipo: string;
  snapshot: any;
  hash_sha256: string;
  status_assinatura: string | null;
  public_access_token?: string | null;
  view_token?: string | null;
  created_at?: string | null;
};

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
      originDescription: `Instrumento particular de crédito privado ID ${loan.id.substring(0, 8)} consolidado via Acordo nº ${agreement.id.substring(0, 8)}.`,
      city: activeUser.city || 'Manaus',
      state: activeUser.state || 'AM',
      witnesses: (loan as any).witnesses || [],
      contractDate: new Date(loan.startDate).toLocaleDateString('pt-BR'),
      agreementDate: new Date(agreement.createdAt).toLocaleDateString('pt-BR'),
      installments: agreement.installments,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Cria (ou reutiliza) documento jurídico SEM inserir direto na tabela (evita permission denied).
   * Usa RPC SECURITY DEFINER: create_documento_juridico_by_loan
   */
  async generateAndRegisterDocument(
    entityId: string,
    params: LegalDocumentParams,
    _profileId: string
  ): Promise<LegalDocumentRecord> {
    const snapshotStr = createLegalSnapshot(params);
    const hash = await generateSHA256(snapshotStr);

    const { data: created, error: rpcError } = await supabase.rpc('create_documento_juridico_by_loan', {
      p_loan_id: params.loanId,
      p_tipo: 'CONFISSAO',
      p_snapshot: params,
      p_acordo_id: entityId === params.loanId ? null : entityId,
    });

    if (rpcError) {
      console.error('Erro Supabase (RPC create_documento_juridico_by_loan):', rpcError);
      throw new Error(`Falha na base de dados: ${rpcError.message}`);
    }

    const row: RpcCreateDocRow | null = Array.isArray(created)
      ? (created[0] as RpcCreateDocRow | undefined) ?? null
      : (created as RpcCreateDocRow | null);

    if (!row?.id) {
      throw new Error('Falha na base de dados: RPC não retornou o documento criado.');
    }

    return {
      id: row.id,
      agreementId: row.acordo_id ?? entityId,
      type: (row.tipo as any) || 'CONFISSAO',
      snapshot: (row.snapshot as any) ?? params,
      hashSHA256: row.hash_sha256 || hash,
      status: row.status_assinatura === 'ASSINADO' ? 'SIGNED' : 'PENDING',
      public_access_token: row.public_access_token ?? undefined,
      createdAt: row.created_at ?? new Date().toISOString(),
    };
  },

  async getFullAuditData(docId: string) {
    const { data: doc, error: docError } = await supabase
      .from('documentos_juridicos')
      .select('*')
      .eq('id', docId)
      .single();

    if (docError || !doc) return { doc: null, signatures: [] };

    const { data: signatures } = await supabase
      .from('assinaturas_documento')
      .select('*')
      .eq('document_id', doc.id);

    return { doc, signatures: signatures || [] };
  },

  async signDocument(docId: string, profileId: string, signerInfo: { name: string; doc: string }, role: string): Promise<void> {
    let ip = '0.0.0.0';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const d = await res.json();
      ip = d.ip;
    } catch (e) {}

    const timestamp = new Date().toISOString();
    const payload = `${docId}|${signerInfo.doc}|${role}|${timestamp}`;
    const hash = await generateSHA256(payload);

    const { error: signError } = await supabase.from('assinaturas_documento').insert({
      document_id: docId,
      profile_id: profileId,
      signer_name: signerInfo.name.toUpperCase(),
      signer_document: signerInfo.doc,
      role: role,
      assinatura_hash: hash,
      ip_origem: ip,
      user_agent: navigator.userAgent,
      signed_at: timestamp,
    });

    if (signError) {
      console.error('Erro Supabase (Assinatura):', signError);
      throw signError;
    }

    await supabase.from('documentos_juridicos').update({ status_assinatura: 'EM_ASSINATURA' }).eq('id', docId);
  },
};