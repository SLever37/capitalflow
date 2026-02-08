// services/portal.service.ts
import { supabase } from '../lib/supabase';

export interface PortalSession {
  client_id: string;
  access_code: 'FRICTIONLESS' | 'MAGIC_LINK';
  identifier: string;
  last_loan_id?: string;
  saved_at: string;
}

export const portalService = {
  async authenticate(loanId: string, identifier: string) {
    const { data, error } = await supabase.rpc('portal_auth_client', {
      p_loan_id: loanId,
      p_identifier: identifier,
    });

    if (error || !data) {
      throw new Error('CPF/Telefone/Código inválido para este contrato.');
    }

    return data;
  },

  async validateMagicLink(loanId: string, code: string) {
    const { data, error } = await supabase.rpc('portal_validate_magic_link', {
      p_loan_id: loanId,
      p_code: code,
    });

    if (error || !data) {
      throw new Error('Link mágico inválido ou expirado.');
    }

    return data;
  },

  async fetchClientContracts(clientId: string) {
    const { data, error } = await supabase
      .from('contratos')
      .select('id, debtor_name, start_date, principal, total_to_receive')
      .eq('client_id', clientId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async fetchLoanData(loanId: string, clientId: string) {
    // 1) Contrato
    const { data: loan, error: loanError } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', loanId)
      .maybeSingle();

    if (loanError || !loan) {
      throw new Error('Contrato não encontrado.');
    }

    // (Opcional) valida que o contrato pertence ao clientId informado
    // Se você não quer bloquear aqui, pode remover esse if.
    if (clientId && loan.client_id && loan.client_id !== clientId) {
      throw new Error('Acesso negado para este contrato.');
    }

    // 2) Dados do credor (perfil do dono)
    const { data: creditorData } = await supabase
      .from('perfis')
      .select('nome_empresa, pix_key')
      .eq('id', loan.profile_id)
      .maybeSingle();

    const pixKey = loan.pix_key || creditorData?.pix_key || '';

    // 3) Acordo ativo (se existir)
    const { data: activeAgreementData } = await supabase
      .from('acordos')
      .select('*, acordo_parcelas(*)')
      .eq('contrato_id', loanId)
      .eq('status', 'ATIVO')
      .maybeSingle();

    let installments: any[] = [];

    if (activeAgreementData?.acordo_parcelas?.length) {
      // parcelas do acordo
      installments = activeAgreementData.acordo_parcelas.map((ap: any) => ({
        ...ap,
        // garante campos esperados no frontend
        data_vencimento: ap.data_vencimento || ap.due_date,
        valor_parcela: ap.valor_parcela || ap.amount,
      }));
    } else {
      // ✅ CORREÇÃO REAL (conforme seu schema):
      // a tabela "parcelas" NÃO tem "contrato_id". Ela tem "loan_id".
      const { data: parcelasData, error: instError } = await supabase
        .from('parcelas')
        .select('*')
        .eq('loan_id', loanId)
        .order('data_vencimento', { ascending: true });

      if (instError) throw instError;

      installments = (parcelasData || []).map((p: any) => ({
        ...p,
        data_vencimento: p.data_vencimento || p.due_date,
        valor_parcela: p.valor_parcela || p.amount,
        lateFeeAccrued: p.late_fee_accrued || 0,
      }));
    }

    // 4) Sinalizações
    const { data: signals } = await supabase
      .from('sinalizacoes_pagamento')
      .select('*')
      .eq('contrato_id', loanId)
      .order('created_at', { ascending: false });

    const loanWithCreditor = {
      ...loan,
      creditorName: creditorData?.nome_empresa || 'Credor',
    };

    return {
      loan: loanWithCreditor,
      pixKey,
      installments,
      signals: signals || [],
      isAgreementActive: !!activeAgreementData,
    };
  },

  async submitPaymentIntent(clientId: string, loanId: string, profileId: string, tipo: string) {
    const { data, error } = await supabase.rpc('portal_submit_payment_intent', {
      p_client_id: clientId,
      p_loan_id: loanId,
      p_profile_id: profileId,
      p_tipo: tipo,
    });

    if (error || !data) throw new Error(error?.message || 'Falha ao registrar intenção.');
    return data as string;
  },

  async uploadReceipt(file: File, intentId: string, profileId: string, clientId: string) {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `receipts/${profileId}/${clientId}/${intentId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);

    // FIX: Usar a tabela correta 'sinalizacoes_pagamento' e coluna 'comprovante_url'
    const { error: dbError } = await supabase
      .from('sinalizacoes_pagamento')
      .update({ comprovante_url: data.publicUrl })
      .eq('id', intentId);

    if (dbError) throw dbError;

    return data.publicUrl;
  },
};