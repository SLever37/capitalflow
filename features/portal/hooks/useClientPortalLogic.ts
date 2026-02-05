
import { useState, useEffect, useCallback, useRef } from 'react';
import { portalService, PortalSession } from '../../../services/portal.service';
import { supabase } from '../../../lib/supabase';
import { legalPublicService } from '../../legal/services/legalPublic.service';

export const useClientPortalLogic = (initialLoanId: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalInfo, setPortalInfo] = useState<string | null>(null);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loggedClient, setLoggedClient] = useState<any | null>(null);
  const [byeName, setByeName] = useState<string | null>(null);

  const [selectedLoanId, setSelectedLoanId] = useState<string>(initialLoanId);
  const [loan, setLoan] = useState<any | null>(null);
  const [pixKey, setPixKey] = useState('');
  const [installments, setInstallments] = useState<any[]>([]);
  const [portalSignals, setPortalSignals] = useState<any[]>([]);
  const [isAgreementActive, setIsAgreementActive] = useState(false);
  
  // Lista de todos os contratos do cliente para o switcher
  const [clientContracts, setClientContracts] = useState<any[]>([]);

  const [intentId, setIntentId] = useState<string | null>(null);
  const [intentType, setIntentType] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Função principal de carregamento
  const loadFullPortalData = useCallback(async (loanId: string, clientId: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setPortalError(null);

    // Atualiza URL sem recarregar para consistência (Link na barra muda)
    const newUrl = new URL(window.location.href);
    if (newUrl.searchParams.get('portal') !== loanId) {
        newUrl.searchParams.set('portal', loanId);
        window.history.replaceState(null, '', newUrl.toString());
    }

    try {
      // 1. Carrega os dados do contrato selecionado E a lista completa de contratos deste cliente
      const [loanData, contractsList] = await Promise.all([
          portalService.fetchLoanData(loanId, clientId),
          portalService.fetchClientContracts(clientId)
      ]);

      setLoan(loanData.loan);
      setPixKey(loanData.pixKey);
      setPortalSignals(loanData.signals || []);
      setInstallments(loanData.installments || []);
      setIsAgreementActive(!!loanData.isAgreementActive);
      
      // Atualiza a lista de contratos para garantir que o dropdown não fique trancado
      setClientContracts(contractsList);

    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setPortalError('Falha ao carregar contrato. Tente atualizar a página.');
        console.error('Portal Data Sync Error:', e);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Inicialização da Sessão (Acesso Direto via Link)
  useEffect(() => {
    const checkSession = async () => {
      // Prioridade total para o link único (initialLoanId)
      if (initialLoanId) {
        try {
          // 1. Valida existência do contrato e descobre o cliente dono
          const { data: loanRef, error: loanError } = await supabase
            .from('contratos')
            .select('client_id')
            .eq('id', initialLoanId)
            .maybeSingle();

          if (loanError || !loanRef) throw new Error('Link inválido ou contrato não encontrado.');

          // 2. Carrega o cliente automaticamente (sem pedir código)
          const { data: clientRef, error: clientError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', loanRef.client_id)
            .single();

          if (clientError || !clientRef) throw new Error('Cliente associado não identificado.');

          // 3. Login automático
          setLoggedClient(clientRef);
          setSelectedLoanId(initialLoanId);
          // O useEffect [selectedLoanId, loggedClient] abaixo disparará o loadFullPortalData
          
        } catch (e: any) {
          console.error("Portal Auto-Login Error:", e);
          setPortalError(e.message || 'Erro ao acessar informações.');
          setIsLoading(false);
        }
      } else {
        setPortalError('Link de acesso inválido.');
        setIsLoading(false);
      }
    };

    checkSession();
    return () => abortControllerRef.current?.abort();
  }, [initialLoanId]);

  // Trigger de Carregamento de Dados (Sempre que ID ou Cliente mudar)
  useEffect(() => {
    if (selectedLoanId && loggedClient) {
      loadFullPortalData(selectedLoanId, loggedClient.id);
    }
  }, [selectedLoanId, loggedClient, loadFullPortalData]);

  const handleLogin = async () => {
    // Método mantido para compatibilidade, mas sem ação no novo fluxo direto
    setPortalError('Por favor, utilize o link fornecido pelo seu gestor.');
  };

  const handleLogout = () => {
    // Apenas limpa o estado local
    setByeName(loggedClient?.name || 'Cliente');
    setLoggedClient(null);
    setLoan(null);
    setPortalError(null);
    setClientContracts([]);
  };

  const handleSignalIntent = async (tipo: string) => {
    if (!loggedClient || !loan) return;

    setPortalError(null);
    setIntentType(tipo);

    if (tipo === 'PAGAR_PIX' && pixKey) {
      navigator.clipboard.writeText(pixKey);
      setPortalInfo('Chave PIX copiada!');
    }

    try {
      const id = await portalService.submitPaymentIntent(
        loggedClient.id,
        selectedLoanId,
        loan.profile_id,
        tipo
      );
      setIntentId(id);
    } catch (e: any) {
      setPortalError(e.message);
    }
  };

  const handleReceiptUpload = async (file: File) => {
    if (!intentId || !loggedClient || !loan) return;

    try {
      setReceiptPreview(URL.createObjectURL(file));
      await portalService.uploadReceipt(file, intentId, loan.profile_id, loggedClient.id);
      setPortalInfo('Comprovante enviado com sucesso!');
    } catch (e: any) {
      setPortalError(e.message);
    }
  };

  const handleSignDocument = async (type: 'CONFISSAO' | 'PROMISSORIA') => {
    if (!loggedClient || !loan || isSigning) return;

    setIsSigning(true);

    try {
      const { data: records, error } = await supabase.rpc(
        'get_documento_juridico_by_loan',
        { p_loan_id: loan.id }
      );

      if (error || !records?.length) {
        throw new Error('Nenhum documento localizado.');
      }

      const token = records[0]?.view_token;
      if (!token) {
        throw new Error('Documento sem token público disponível.');
      }

      let ip = '0.0.0.0';
      try {
        const r = await fetch('https://api.ipify.org?format=json');
        const j = await r.json();
        ip = j.ip;
      } catch {}

      await legalPublicService.signDocumentPublicly(
        token,
        {
          name: loggedClient.name,
          doc: loggedClient.document || loggedClient.cpf || loggedClient.cnpj || 'N/A',
          role: 'DEVEDOR',
        },
        { ip, userAgent: navigator.userAgent }
      );

      alert(
        type === 'CONFISSAO'
          ? 'Confissão de Dívida assinada com sucesso!'
          : 'Nota Promissória assinada com sucesso!'
      );

      loadFullPortalData(selectedLoanId, loggedClient.id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSigning(false);
    }
  };

  const handleViewDocument = async () => {
      if (!loan) return;
      try {
          const { data: records, error } = await supabase.rpc(
            'get_documento_juridico_by_loan',
            { p_loan_id: loan.id }
          );

          if (error || !records?.length) {
            alert('Documento ainda não gerado pelo gestor.');
            return;
          }

          const token = records[0]?.view_token;
          if (token) {
              const url = `${window.location.origin}/?legal_sign=${token}&role=DEVEDOR`;
              window.open(url, '_blank');
          }
      } catch (e: any) {
          console.error(e);
          alert("Erro ao abrir documento.");
      }
  };

  return {
    isLoading,
    isSigning,
    portalError,
    portalInfo,
    loginIdentifier,
    setLoginIdentifier,
    loggedClient,
    byeName,
    selectedLoanId,
    setSelectedLoanId,
    clientContracts,
    loan,
    installments,
    portalSignals,
    isAgreementActive,
    intentId,
    intentType,
    receiptPreview,
    pixKey,
    handleLogin,
    handleLogout,
    handleSignalIntent,
    handleReceiptUpload,
    handleSignDocument,
    handleViewDocument,
    loadFullPortalData,
  };
};
