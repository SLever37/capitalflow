
import { supabase } from '../lib/supabase';
import { onlyDigits } from '../utils/formatters';

export interface PortalSession {
  client_id: string;
  access_code: string;
  identifier: string;
  last_loan_id: string;
  saved_at: string;
}

export const portalService = {
  /**
   * Autentica o cliente verificando se os dados batem com o cadastro vinculado ao contrato.
   */
  async authenticate(loanId: string, identifierRaw: string, code: string) {
    // 1. Validar inputs
    const cleanIdentifier = onlyDigits(identifierRaw);
    const cleanCode = code.trim();

    if (!cleanIdentifier || !cleanCode) {
      throw new Error('Informe seu CPF/CNPJ (ou Telefone) e o código de acesso.');
    }

    // 2. Buscar o contrato para saber quem é o cliente
    const { data: loan, error: loanError } = await supabase
      .from('contratos')
      .select('client_id')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) throw new Error('Contrato não encontrado ou ID inválido.');
    if (!loan.client_id) throw new Error('Este contrato não possui vínculo com um cliente cadastrado.');

    // 3. Buscar dados REAIS do cliente (Fonte da Verdade)
    const { data: client, error: clientError } = await supabase
      .from('clientes')
      .select('id, name, phone, document, cpf, cnpj, client_number, access_code')
      .eq('id', loan.client_id)
      .single();

    if (clientError || !client) throw new Error('Cadastro do cliente não encontrado.');

    // 4. Validar Código de Acesso
    const expectedCode = String(client.access_code || '').trim();
    if (expectedCode !== cleanCode) {
      throw new Error('Código de acesso incorreto para este cliente.');
    }

    // 5. Validar Identificador (CPF, CNPJ, Telefone ou Nº Cliente)
    const dbDoc = onlyDigits(client.document || client.cpf || client.cnpj || '');
    const dbPhone = onlyDigits(client.phone || '');
    const dbClientNum = onlyDigits(client.client_number || '');

    // Verificação de Identidade Robusta:
    // O identificador informado deve ser exatamente igual ao CPF/CNPJ ou Telefone ou Numero de Cliente no banco.
    // Nota: Removido bloqueio do CPF '00000000000' para permitir acesso de clientes legados.
    const match = 
      (dbDoc && cleanIdentifier === dbDoc) || 
      (dbPhone && cleanIdentifier === dbPhone) || 
      (dbClientNum && cleanIdentifier === dbClientNum);

    if (!match) {
      throw new Error('O Identificador (CPF/CNPJ ou Tel) não corresponde ao cadastro deste cliente. Verifique se digitou corretamente.');
    }

    // 6. Registrar Log de Acesso para Auditoria
    await supabase.from('logs_acesso_cliente').insert([{ client_id: client.id, loan_id: loanId }]);

    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      document: client.document || client.cpf || client.cnpj,
      client_number: client.client_number,
      access_code: client.access_code
    };
  },

  /**
   * Valida uma sessão salva no localStorage
   */
  async validateSession(clientId: string, accessCode: string) {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, name, phone, document, cpf, cnpj, client_number')
      .eq('id', clientId)
      .eq('access_code', accessCode)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      document: data.document || data.cpf || data.cnpj,
      client_number: data.client_number
    };
  },

  /**
   * Carrega todos os dados necessários para exibir o contrato no portal
   */
  async fetchLoanData(loanId: string, clientId: string) {
    // 1. Contrato
    const { data: loan, error: loanErr } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', loanId)
      .single();
    
    if (loanErr) throw loanErr;

    // 2. Chave PIX do Perfil (Operador)
    let pixKey = '';
    if (loan.profile_id) {
      const { data: profile } = await supabase.from('perfis').select('pix_key').eq('id', loan.profile_id).single();
      if (profile) pixKey = profile.pix_key || '';
    }

    // 3. Parcelas
    const { data: installments } = await supabase
      .from('parcelas')
      .select('data_vencimento, valor_parcela, numero_parcela, status, due_date, amount')
      .eq('loan_id', loanId)
      .order('data_vencimento', { ascending: true });

    // 4. Sinalizações (Histórico de pedidos)
    const { data: signals } = await supabase
      .from('sinalizacoes_pagamento')
      .select('*')
      .eq('loan_id', loanId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    // Marcar atualizações como vistas (se houver aprovação/negação não vista)
    if (signals && signals.length > 0) {
      const unseenIds = signals
        .filter((s: any) => (s.status === 'APROVADO' || s.status === 'NEGADO') && !s.client_viewed_at)
        .map((s: any) => s.id);
      
      if (unseenIds.length > 0) {
        await supabase.from('sinalizacoes_pagamento')
          .update({ client_viewed_at: new Date().toISOString() })
          .in('id', unseenIds);
      }
    }

    return {
      loan,
      pixKey,
      installments: (installments || []).map((p: any) => ({
        data_vencimento: p.data_vencimento || p.due_date,
        valor_parcela: p.valor_parcela || p.amount,
        numero_parcela: p.numero_parcela,
        status: p.status
      })),
      signals: signals || []
    };
  },

  /**
   * Lista outros contratos ativos do mesmo cliente
   */
  async fetchClientLoansList(clientId: string, profileId: string) {
    const { data } = await supabase
      .from('contratos')
      .select('id, start_date, principal, interest_rate, total_to_receive, is_archived, debtor_name')
      .eq('client_id', clientId)
      .eq('profile_id', profileId)
      .order('start_date', { ascending: false });
    return data || [];
  },

  /**
   * Envia intenção de pagamento
   */
  async submitPaymentIntent(clientId: string, loanId: string, profileId: string, type: string) {
    const { data, error } = await supabase
      .from('sinalizacoes_pagamento')
      .insert([{
        client_id: clientId,
        loan_id: loanId,
        tipo_intencao: type,
        status: 'PENDENTE',
        profile_id: profileId
      }])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  /**
   * Upload de comprovante
   */
  async uploadReceipt(file: File, signalId: string, profileId: string, clientId: string) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const safeName = `${signalId}.${ext}`;
    const storagePath = `${profileId || 'public'}/${clientId}/${safeName}`;

    const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(storagePath, file, { upsert: true, contentType: file.type || 'application/octet-stream' });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from('comprovantes').getPublicUrl(storagePath);
    const comprovanteUrl = publicData?.publicUrl || storagePath;

    const { error: updateError } = await supabase
        .from('sinalizacoes_pagamento')
        .update({ comprovante_url: comprovanteUrl })
        .eq('id', signalId);

    if (updateError) throw updateError;
    
    return comprovanteUrl;
  }
};
