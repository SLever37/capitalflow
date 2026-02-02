
import { supabase } from '../lib/supabase';
import { onlyDigits } from '../utils/formatters';
import { generateUUID } from '../utils/generators';

export interface PortalSession {
  client_id: string;
  access_code: string;
  identifier: string;
  last_loan_id: string;
  saved_at: string;
}

export const portalService = {
  /**
   * Autentica o cliente verificando APENAS se os dados batem com o cadastro vinculado ao contrato.
   * Frictionless Login: Não exige senha, apenas conhecimento de um dado pessoal (CPF, Tel ou Nº Cliente).
   */
  async authenticate(loanId: string, identifierRaw: string) {
    // Delay artificial mínimo para segurança
    await new Promise(resolve => setTimeout(resolve, 300));

    // 1. Validar inputs
    const cleanIdentifier = onlyDigits(identifierRaw);

    if (!cleanIdentifier) {
      throw new Error('Informe seu CPF/CNPJ, Telefone ou Número do Cliente.');
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

    // 4. Verificação de Identidade (Sem Senha/Código)
    const dbDoc = onlyDigits(client.document || client.cpf || client.cnpj || '');
    const dbPhone = onlyDigits(client.phone || '');
    const dbClientNum = onlyDigits(client.client_number || '');

    let match = false;

    // A) Match Exato de Documento ou Nº Cliente
    if ((dbDoc && cleanIdentifier === dbDoc) || (dbClientNum && cleanIdentifier === dbClientNum)) {
        match = true;
    } 
    // B) Match Inteligente de Telefone
    else if (dbPhone && cleanIdentifier.length >= 8) {
        if (dbPhone === cleanIdentifier) match = true;
        else if (dbPhone.endsWith(cleanIdentifier)) match = true; // Ex: Digita sem 55, banco tem 55
        else if (cleanIdentifier.endsWith(dbPhone)) match = true; // Ex: Digita com 55, banco tem sem
    }

    if (!match) {
      throw new Error('Dado incorreto. O CPF, Telefone ou Código informado não corresponde ao cadastro deste contrato.');
    }

    // 5. Registrar Log de Acesso
    await supabase.from('logs_acesso_cliente').insert([{ client_id: client.id, loan_id: loanId }]);

    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      document: client.document || client.cpf || client.cnpj,
      client_number: client.client_number,
      access_code: client.access_code // Retorna apenas para consistência interna se necessário
    };
  },

  /**
   * Valida Magic Link (Link com Código Embutido)
   */
  async validateMagicLink(loanId: string, code: string) {
      const cleanCode = code.trim();
      
      const { data: loan, error: loanError } = await supabase
        .from('contratos')
        .select('client_id')
        .eq('id', loanId)
        .single();

      if (loanError || !loan) throw new Error('Link inválido (Contrato).');

      const { data: client, error: clientError } = await supabase
        .from('clientes')
        .select('id, name, document, cpf, cnpj, phone, client_number, access_code')
        .eq('id', loan.client_id)
        .single();

      if (clientError || !client) throw new Error('Link inválido (Cliente).');

      const expectedCode = String(client.access_code || '').trim();
      if (expectedCode !== cleanCode) {
          throw new Error('Link expirado ou código inválido.');
      }

      return {
          id: client.id,
          name: client.name,
          phone: client.phone,
          document: client.document || client.cpf || client.cnpj,
          client_number: client.client_number,
          access_code: client.access_code
      };
  },

  async validateSession(clientId: string, accessCode: string) {
    // Validação flexível: Se tiver ID, retorna os dados. 
    // Assume que a autenticação (senha ou dado pessoal) já ocorreu na criação da sessão.
    const { data, error } = await supabase
      .from('clientes')
      .select('id, name, phone, document, cpf, cnpj, client_number')
      .eq('id', clientId)
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

  async fetchLoanData(loanId: string, clientId: string) {
    // BUSCA COM JOIN NO PERFIL PARA PEGAR DADOS DO CREDOR
    const { data: loan, error: loanErr } = await supabase
      .from('contratos')
      .select(`
        *,
        perfis:profile_id (
            nome_empresa,
            nome_operador,
            document,
            pix_key,
            address,
            city,
            state
        )
      `)
      .eq('id', loanId)
      .single();
    
    if (loanErr) throw loanErr;

    // Normaliza dados do credor
    const creditorProfile = (loan as any).perfis;
    const loanWithCreditor = {
        ...loan,
        creditorName: creditorProfile?.nome_empresa || creditorProfile?.nome_operador || 'Credor Registrado',
        creditorDoc: creditorProfile?.document || '',
        creditorAddress: creditorProfile?.address ? `${creditorProfile.address} - ${creditorProfile.city}/${creditorProfile.state}` : 'Endereço Comercial'
    };

    let pixKey = '';
    if (creditorProfile?.pix_key) {
        pixKey = creditorProfile.pix_key;
    }

    const { data: activeAgreement } = await supabase
        .from('acordos_inadimplencia')
        .select('*, acordo_parcelas(*)')
        .eq('loan_id', loanId)
        .eq('status', 'ACTIVE')
        .single();

    let installments = [];

    if (activeAgreement) {
        installments = activeAgreement.acordo_parcelas.map((ap: any) => ({
            data_vencimento: ap.data_vencimento,
            valor_parcela: ap.valor,
            numero_parcela: ap.numero,
            status: ap.status,
            isAgreement: true
        })).sort((a: any, b: any) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
    } else {
        const { data: originalInstallments } = await supabase
          .from('parcelas')
          .select('data_vencimento, valor_parcela, numero_parcela, status, due_date, amount')
          .eq('loan_id', loanId)
          .order('data_vencimento', { ascending: true });
        
        installments = (originalInstallments || []).map((p: any) => ({
            data_vencimento: p.data_vencimento || p.due_date,
            valor_parcela: p.valor_parcela || p.amount,
            numero_parcela: p.numero_parcela,
            status: p.status
        }));
    }

    const { data: signals } = await supabase
      .from('sinalizacoes_pagamento')
      .select('*')
      .eq('loan_id', loanId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    return {
        loan: loanWithCreditor,
        pixKey,
        installments,
        signals,
        isAgreementActive: !!activeAgreement
    };
  },

  // Busca todos os contratos ativos do cliente para permitir troca
  async fetchClientContracts(clientId: string) {
      const { data, error } = await supabase
          .from('contratos')
          .select('id, total_to_receive, start_date, created_at, principal')
          .eq('client_id', clientId)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });
      
      if (error) return [];
      
      // Mapeia para adicionar campos extras se necessário (ex: extrair código do ID se houver convenção)
      return (data || []).map((c: any) => ({
          ...c,
          // Extrai os últimos 6 chars como código curto para display
          code: c.id.substring(0, 6).toUpperCase()
      }));
  },

  async submitPaymentIntent(clientId: string, loanId: string, profileId: string, type: string) {
      const { data, error } = await supabase.from('sinalizacoes_pagamento').insert([{
          client_id: clientId,
          loan_id: loanId,
          profile_id: profileId,
          tipo_intencao: type,
          status: 'PENDENTE'
      }]).select().single();
      
      if (error) throw error;
      return data.id;
  },

  async uploadReceipt(file: File, signalId: string, profileId: string, clientId: string) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${profileId}/comprovante_${signalId}_${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage.from('comprovantes').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('comprovantes').getPublicUrl(path);
      
      await supabase.from('sinalizacoes_pagamento').update({
          comprovante_url: publicUrl.publicUrl,
          status: 'PENDENTE' 
      }).eq('id', signalId);
  }
};
