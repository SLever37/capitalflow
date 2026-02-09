
import { useState, useEffect, useCallback, useMemo } from 'react';
import { portalService } from '../../../services/portal.service';
import { mapLoanFromDB } from '../../../services/adapters/loanAdapter';
import { Loan } from '../../../types';
import { resolveDebtSummary } from '../mappers/portalDebtRules';

export const useClientPortalLogic = (initialToken: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Dados Centrados no Cliente
  const [loggedClient, setLoggedClient] = useState<any>(null);
  const [clientContracts, setClientContracts] = useState<Loan[]>([]);

  // Estado Auxiliar
  const [isSigning, setIsSigning] = useState(false);

  // Carregamento Unificado
  const loadFullPortalData = useCallback(async () => {
    if (!initialToken) return;

    setIsLoading(true);
    setPortalError(null);

    try {
      // 1. Validação de Acesso (Usa o token para achar o contrato "porta de entrada")
      // Agora já traz parcelas e sinais, evitando round-trips falhos
      const entryLoan = await portalService.fetchLoanByToken(initialToken);
      const clientId = (entryLoan as any)?.client_id;
      
      if (!clientId) throw new Error('Contrato sem cliente associado.');

      // 2. Dados do Cliente
      const clientData = (entryLoan as any)?.clients || await portalService.fetchClientById(clientId);
      if (!clientData?.id) throw new Error('Dados do cliente não encontrados.');

      setLoggedClient({
        id: clientData.id,
        name: clientData.name,
        document: clientData.document || '',
        phone: clientData.phone,
        email: clientData.email
      });

      // 3. SEGURANÇA E ISOLAMENTO:
      // Carregamos EXCLUSIVAMENTE o contrato vinculado ao token.
      // Removemos qualquer busca por outros contratos do cliente para evitar vazamento de dados.
      const loanObject = mapLoanFromDB(
          entryLoan, 
          [clientData]
      );

      // Define lista com apenas o contrato autorizado pelo token
      setClientContracts([loanObject]);

    } catch (err: any) {
      console.error('Portal Load Error:', err);
      setPortalError(err?.message || 'Não foi possível carregar os dados do portal.');
    } finally {
      setIsLoading(false);
    }
  }, [initialToken]);

  useEffect(() => {
    loadFullPortalData();
  }, [loadFullPortalData]);

  const handleSignDocument = async (type: string) => {
    // Pega o ID do contrato atual
    const currentLoan = clientContracts[0];
    if (!currentLoan) return;

    setIsSigning(true);
    try {
        const doc = await portalService.getLatestLegalDocument(currentLoan.id);
        
        if (!doc || !doc.view_token) {
            alert("Nenhum documento pendente de assinatura foi encontrado para este contrato. Solicite ao seu gestor.");
            return;
        }

        if (doc.status_assinatura === 'ASSINADO') {
             // Se já assinado, abre para visualização/download
             const url = `${window.location.origin}/?legal_sign=${doc.view_token}&role=DEVEDOR`;
             window.open(url, '_blank');
        } else {
             // Se pendente, abre para assinatura
             const url = `${window.location.origin}/?legal_sign=${doc.view_token}&role=DEVEDOR`;
             window.location.href = url; // Redireciona na mesma aba ou nova aba conforme preferência
        }

    } catch (e: any) {
        console.error(e);
        alert("Erro ao acessar documento: " + e.message);
    } finally {
        setIsSigning(false);
    }
  };

  const handleViewDocument = () => {};

  return {
    isLoading,
    portalError,
    loggedClient,
    clientContracts, // Array contendo apenas o contrato do token
    loadFullPortalData,
    handleSignDocument,
    handleViewDocument,
    isSigning,
    // Compatibilidade temporária
    activeToken: initialToken,
    setActiveToken: () => {}, 
  };
};
