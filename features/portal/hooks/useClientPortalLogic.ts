
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
      // 1. Validação de Acesso e Busca do Contrato Inicial (via RPC Seguro)
      const entryLoan = await portalService.fetchLoanByToken(initialToken);
      const clientId = entryLoan.clientId;
      
      if (!clientId) throw new Error('Contrato sem cliente associado.');

      // 2. Dados do Cliente
      // Tenta buscar dados completos ou usa o que veio no contrato
      let clientData = await portalService.fetchClientById(clientId);
      if (!clientData) {
          // Fallback: Usa dados denormalizados do contrato se o RLS bloquear a tabela de clientes
          clientData = {
              id: clientId,
              name: entryLoan.debtorName,
              document: entryLoan.debtorDocument,
              phone: entryLoan.debtorPhone,
              email: (entryLoan as any).debtorEmail // Se houver
          };
      }

      setLoggedClient(clientData);

      // 3. Buscar TODOS os contratos deste cliente (via RPC Seguro)
      // Passamos o initialToken para validar que temos permissão de ver os dados desse cliente
      const rawContractsList = await portalService.fetchClientContracts(clientId, initialToken);
      
      // 4. Hidratação: Se o RPC get_portal_contracts_by_token retornar apenas headers,
      // precisariamos buscar detalhes. Mas para o portal funcionar bem com RLS restrito,
      // o ideal seria o RPC já retornar dados suficientes.
      // Assumindo que rawContractsList contém dados da tabela 'contratos', precisamos das parcelas.
      
      const hydratedContracts: Loan[] = await Promise.all(
        rawContractsList.map(async (contractHeader: any) => {
            // Se for o contrato atual, já temos os dados completos do passo 1
            if (contractHeader.id === entryLoan.id) return entryLoan;

            // Para outros contratos, se o usuário não está logado, 
            // ele não conseguirá fazer 'select * from parcelas'.
            // Solução: Usar o token deste outro contrato para buscar via RPC individualmente
            if (contractHeader.portal_token) {
                 try {
                     return await portalService.fetchLoanByToken(contractHeader.portal_token);
                 } catch {
                     return null;
                 }
            }
            return null;
        })
      );

      // Filtra nulos e ordena por status (atrasados primeiro)
      const validContracts = hydratedContracts.filter(Boolean) as Loan[];
      
      // Ordenação Inteligente:
      const sortedContracts = validContracts.sort((a, b) => {
          const summaryA = resolveDebtSummary(a, a.installments);
          const summaryB = resolveDebtSummary(b, b.installments);
          
          if (summaryA.hasLateInstallments && !summaryB.hasLateInstallments) return -1;
          if (!summaryA.hasLateInstallments && summaryB.hasLateInstallments) return 1;
          
          const dateA = summaryA.nextDueDate?.getTime() || 9999999999999;
          const dateB = summaryB.nextDueDate?.getTime() || 9999999999999;
          return dateA - dateB;
      });

      setClientContracts(sortedContracts);

    } catch (err: any) {
      console.error('Portal Load Error:', err);
      setPortalError(err?.message || 'Link inválido ou expirado.');
    } finally {
      setIsLoading(false);
    }
  }, [initialToken]);

  useEffect(() => {
    loadFullPortalData();
  }, [loadFullPortalData]);

  const handleSignDocument = async (_type: string) => {
    setIsSigning(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsSigning(false);
    alert('Funcionalidade de assinatura em desenvolvimento.');
  };

  const handleViewDocument = () => {};

  return {
    isLoading,
    portalError,
    loggedClient,
    clientContracts,
    loadFullPortalData,
    handleSignDocument,
    handleViewDocument,
    isSigning,
    activeToken: initialToken,
    setActiveToken: () => {}, 
  };
};
