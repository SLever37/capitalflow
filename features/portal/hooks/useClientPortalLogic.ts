
import { useState, useEffect, useCallback } from 'react';
import { portalService } from '../../../services/portal.service';
import { mapLoanFromDB } from '../../../services/adapters/loanAdapter';
import { Loan, Installment } from '../../../types';

export const useClientPortalLogic = (initialToken: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [portalError, setPortalError] = useState<string | null>(null);
  
  // Estado de Dados
  const [loan, setLoan] = useState<Loan | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [clientContracts, setClientContracts] = useState<any[]>([]);
  const [loggedClient, setLoggedClient] = useState<any>(null);
  
  // Estado de UI - Token Ativo (Fonte da Verdade)
  const [activeToken, setActiveToken] = useState<string>(initialToken);
  const [isSigning, setIsSigning] = useState(false);

  // 1. Carrega dados baseados no TOKEN ativo
  const loadPortalData = useCallback(async (token: string) => {
    if (!token) return;
    
    setIsLoading(true);
    setPortalError(null);

    try {
      // A) Busca Contrato pelo Token (Segurança: Token é a chave)
      const rawLoan = await portalService.fetchLoanByToken(token);
      
      // B) Identifica Cliente e Operador
      const clientData = rawLoan.clients;
      if (!clientData) throw new Error("Dados do cliente não encontrados.");

      setLoggedClient({
        id: clientData.id,
        name: clientData.name,
        document: clientData.document || '',
        phone: clientData.phone
      });

      // C) Carrega detalhes do contrato (Parcelas, Sinais)
      const { installments: rawInst, signals } = await portalService.fetchLoanDetails(rawLoan.id);

      // D) Mapeia para o padrão do Frontend (CamelCase)
      const mappedLoan = mapLoanFromDB(rawLoan, rawInst, undefined, []);
      
      // Injeta sinais mapeados e token para consistência
      mappedLoan.paymentSignals = signals;
      // Garante que o token atual esteja no objeto, útil para UI
      (mappedLoan as any).portal_token = token;

      setLoan(mappedLoan);
      setInstallments(mappedLoan.installments);

      // E) Carrega lista de outros contratos deste cliente (para o dropdown)
      const contracts = await portalService.fetchClientContracts(clientData.id);
      setClientContracts(contracts);

    } catch (err: any) {
      console.error("Portal Load Error:", err);
      setPortalError(err.message || "Não foi possível carregar o contrato.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Inicialização e Reação a Troca de Token
  useEffect(() => {
    if (activeToken) {
      loadPortalData(activeToken);
    }
  }, [activeToken, loadPortalData]);

  // Função para trocar de contrato
  const handleSwitchContract = (newToken: string) => {
    if (!newToken || newToken === activeToken) return;
    
    // Atualiza URL silenciosamente para permitir refresh/bookmark
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('portal', newToken);
    window.history.pushState({}, '', newUrl);
    
    // Atualiza estado para disparar reload
    setActiveToken(newToken);
  };

  const handleSignDocument = async (type: string) => {
    setIsSigning(true);
    // Simulação por enquanto
    await new Promise(r => setTimeout(r, 1500));
    setIsSigning(false);
    alert("Funcionalidade de assinatura em desenvolvimento.");
  };

  const handleViewDocument = () => {
    // Placeholder
  };

  return {
    isLoading,
    portalError,
    
    // Dados
    loan,
    installments,
    loggedClient,
    clientContracts,
    
    // Controle
    activeToken,
    setActiveToken: handleSwitchContract, // Exposto wrapper seguro
    
    // Ações
    loadFullPortalData: () => loadPortalData(activeToken), // Recarregar atual
    handleSignDocument,
    handleViewDocument,
    isSigning
  };
};
