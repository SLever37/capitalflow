
import { useState, useEffect, useCallback, useRef } from 'react';
import { portalService, PortalSession } from '../../../services/portal.service';
import { supabase } from '../../../lib/supabase';
import { legalPublicService } from '../../legal/services/legalPublic.service';

const PORTAL_SESSION_KEY = 'cm_portal_session';

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

  const loadFullPortalData = useCallback(async (loanId: string, clientId: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setPortalError(null);

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
      setClientContracts(contractsList);

    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setPortalError('Falha ao sincronizar dados do contrato.');
        console.error('Portal Data Sync Error:', e);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Inicialização da Sessão
  useEffect(() => {
    const checkSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const magicCode = params.get('code');
      const portalId = params.get('portal');

      // A) Magic Link
      if (magicCode && portalId) {
        try {
          const clientData = await portalService.validateMagicLink(portalId, magicCode);
          setLoggedClient(clientData);
          setSelectedLoanId(portalId);

          const session: PortalSession = {
            client_id: clientData.id,
            access_code: 'MAGIC_LINK',
            identifier: 'MAGIC_LINK',
            last_loan_id: portalId,
            saved_at: new Date().toISOString(),
          };

          localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
          // Importante: Não setar isLoading false aqui, deixar o useEffect do selectedLoanId carregar os dados
          return; 
        } catch {
          console.error('Magic Link inválido.');
        }
      }

      // B) Sessão Salva (LocalStorage)
      try {
        const raw = localStorage.getItem(PORTAL_SESSION_KEY);
        if (!raw) {
            setIsLoading(false);
            return;
        }

        const sess = JSON.parse(raw) as PortalSession;
        
        // Verifica se a sessão é válida e restaura dados mínimos do cliente
        if (sess.client_id) {
            // Recupera nome do cliente para a UI inicial (será atualizado no loadFull)
            const { data: clientCheck } = await supabase.from('clientes').select('id, name, document').eq('id', sess.client_id).single();
            if (clientCheck) {
                setLoggedClient(clientCheck);
                if (sess.last_loan_id) setSelectedLoanId(sess.last_loan_id);
            } else {
                localStorage.removeItem(PORTAL_SESSION_KEY);
            }
        }
      } catch {
        localStorage.removeItem(PORTAL_SESSION_KEY);
      } finally {
        // Se não tiver selecionado contrato ainda, para o loading aqui
        if (!selectedLoanId) setIsLoading(false);
      }
    };

    checkSession();
    return () => abortControllerRef.current?.abort();
  }, []);

  // Trigger de Carregamento de Dados (Sempre que ID ou Cliente mudar)
  useEffect(() => {
    if (selectedLoanId && loggedClient) {
      loadFullPortalData(selectedLoanId, loggedClient.id);
    }
  }, [selectedLoanId, loggedClient, loadFullPortalData]);

  const handleLogin = async () => {
    if (!loginIdentifier) {
      setPortalError('Informe seu CPF, telefone ou código.');
      return;
    }

    setPortalError(null);
    setIsLoading(true);

    try {
      // Autentica usando o contrato atual selecionado na URL (se houver) ou busca genérica se implementado
      const client = await portalService.authenticate(selectedLoanId, loginIdentifier);
      setLoggedClient(client);
      setByeName(null);

      // Salva sessão
      const session: PortalSession = {
        client_id: client.id,
        access_code: 'FRICTIONLESS',
        identifier: loginIdentifier,
        last_loan_id: selectedLoanId,
        saved_at: new Date().toISOString(),
      };
      localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
      
      // O useEffect do selectedLoanId vai disparar o loadFullPortalData
    } catch (e: any) {
      setPortalError(e.message);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(PORTAL_SESSION_KEY);
    setByeName(loggedClient?.name || 'Cliente');
    setLoggedClient(null);
    setLoan(null);
    setPortalError(null);
    setClientContracts([]); // Limpa lista
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

  // Nova função para VISUALIZAR/BAIXAR documento antes de assinar
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
              // Abre a página pública de assinatura que renderiza o PDF/HTML
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
