
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

      // 3. Buscar TODOS os contratos deste cliente (Lista Resumida)
      const rawContractsList = await portalService.fetchClientContracts(clientId);
      
      // 4. Hidratação Profunda (Carregar parcelas e detalhes para CADA contrato)
      // Isso permite que a UI mostre o status real de todos eles simultaneamente.
      const hydratedContracts: Loan[] = await Promise.all(
        rawContractsList.map(async (contractHeader: any) => {
            // Busca dados completos no banco para este contrato específico
            // Precisamos dos dados 'raw' do contrato + parcelas
            // Como fetchClientContracts retorna parcial, vamos buscar o full loan details de cada um
            // Otimização: Poderíamos criar uma RPC, mas aqui faremos via loop controlado
            
            // Reutiliza a lógica de fetch loan by ID (simulada aqui recuperando o loan completo)
            // Precisamos buscar o contrato completo no supabase
            // A portalService não tem "fetchLoanById", vamos usar a lógica interna ou expandir a service
            // Para simplificar e manter segurança, usamos o fetchDetails que já pega parcelas
            
            // A solução mais robusta é buscar o contrato completo
            const fullLoanData = await portalService.fetchFullLoanById(contractHeader.id);
            
            if (!fullLoanData) return null;

            return mapLoanFromDB(
                fullLoanData, 
                fullLoanData.parcelas, 
                undefined, // acordos (se necessário, expandir query)
                [] 
            );
        })
      );

      // CORREÇÃO: Filtra nulos E contratos encerrados
      const validContracts = hydratedContracts.filter((contract) => {
        if (!contract) return false;
        // Não mostrar contratos com status ENCERRADO ou PAID
        if (contract.status === 'ENCERRADO' || contract.status === 'PAID') return false;
        // Não mostrar contratos sem parcelas pendentes (já quitados)
        const summary = resolveDebtSummary(contract, contract.installments);
        return summary.pendingCount > 0;
      }) as Loan[];
      
      // Ordenação Inteligente:
      // 1. Atrasados
      // 2. A Vencer Próximo
      // 3. Pagos/Arquivados pro final
      const sortedContracts = validContracts.sort((a, b) => {
          const summaryA = resolveDebtSummary(a, a.installments);
          const summaryB = resolveDebtSummary(b, b.installments);
          
          // Prioridade para quem tem atraso
          if (summaryA.hasLateInstallments && !summaryB.hasLateInstallments) return -1;
          if (!summaryA.hasLateInstallments && summaryB.hasLateInstallments) return 1;
          
          // Se ambos iguais, pelo vencimento mais próximo
          const dateA = summaryA.nextDueDate?.getTime() || 9999999999999;
          const dateB = summaryB.nextDueDate?.getTime() || 9999999999999;
          return dateA - dateB;
      });

      setClientContracts(sortedContracts);

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
    clientContracts, // Array completo de contratos
    loadFullPortalData,
    handleSignDocument,
    handleViewDocument,
    isSigning,
    // Compatibilidade temporária
    activeToken: initialToken,
    setActiveToken: () => {}, 
  };
};
