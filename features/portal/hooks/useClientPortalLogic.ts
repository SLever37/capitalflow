
import { useState, useEffect, useCallback } from 'react';
import { portalService } from '../../../services/portal.service';
import { mapLoanFromDB } from '../../../services/adapters/loanAdapter';
import { Loan } from '../../../types';

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
    // Se o token for vazio, não tenta carregar para evitar erros de RLS
    if (!initialToken || initialToken === 'null') {
        setIsLoading(false);
        setPortalError('Token de acesso não identificado.');
        return;
    }

    setIsLoading(true);
    setPortalError(null);

    try {
      // 1. Validação de Acesso (Usa o token público 'portal_token')
      const entryLoan = await portalService.fetchLoanByToken(initialToken);
      
      if (!entryLoan) throw new Error('Contrato não localizado ou link inválido.');
      
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
      // Carregamos EXCLUSIVAMENTE o contrato vinculado ao token atual.
      const loanObject = mapLoanFromDB(
          entryLoan, 
          [clientData]
      );

      // Define lista com o contrato autorizado.
      setClientContracts([loanObject]);

    } catch (err: any) {
      console.error('Portal Load Error:', err);
      setPortalError(err?.message || 'Acesso negado ou link expirado.');
    } finally {
      setIsLoading(false);
    }
  }, [initialToken]);

  useEffect(() => {
    loadFullPortalData();
  }, [loadFullPortalData]);

  const handleSignDocument = async () => {
    const currentLoan = clientContracts[0];
    if (!currentLoan) return;

    setIsSigning(true);
    try {
        const doc = await portalService.getLatestLegalDocument(currentLoan.id);
        
        if (!doc || !doc.view_token) {
            alert("Não há documentos pendentes de assinatura para este contrato.");
            return;
        }

        // Redireciona para a página de assinatura pública do sistema
        const url = `${window.location.origin}/?legal_sign=${doc.view_token}&role=DEVEDOR`;
        window.location.href = url;

    } catch (e: any) {
        console.error(e);
        alert("Erro ao acessar documento.");
    } finally {
        setIsSigning(false);
    }
  };

  return {
    isLoading,
    portalError,
    loggedClient,
    clientContracts,
    loadFullPortalData,
    handleSignDocument,
    isSigning
  };
};
