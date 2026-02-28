import { useState, useEffect, useCallback } from 'react';
import { portalService } from '../../../services/portal.service';
import { mapLoanFromDB } from '../../../services/adapters/dbAdapters';
import { Loan, LoanStatus } from '../../../types';
import { resolveDebtSummary } from '../mappers/portalDebtRules';

export const useClientPortalLogic = (initialToken: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Dados do Cliente
  const [loggedClient, setLoggedClient] = useState<any>(null);
  const [clientContracts, setClientContracts] = useState<Loan[]>([]);
  const [isSigning, setIsSigning] = useState(false);

  const loadFullPortalData = useCallback(async () => {
    if (!initialToken) return;

    setIsLoading(true);
    setPortalError(null);

    try {
      // 1️⃣ Validar token e obter contrato inicial
      const entryLoan = await portalService.fetchLoanByToken(initialToken);
      const clientId = (entryLoan as any)?.client_id;

      if (!clientId) {
        throw new Error('Contrato sem cliente associado.');
      }

      // 2️⃣ Buscar dados do cliente
      const clientData =
        (entryLoan as any)?.clients ||
        (await portalService.fetchClientById(clientId));

      if (!clientData?.id) {
        throw new Error('Dados do cliente não encontrados.');
      }

      setLoggedClient({
        id: clientData.id,
        name: clientData.name,
        document: clientData.document || '',
        phone: clientData.phone,
        email: clientData.email,
      });

      // 3️⃣ Buscar todos contratos do cliente
      const rawContractsList = await portalService.fetchClientContracts(clientId);

      // 4️⃣ Hidratar cada contrato
      const hydratedContracts = await Promise.all(
        rawContractsList.map(async (contractHeader: any) => {
          const fullLoanData = await portalService.fetchFullLoanById(contractHeader.id);
          if (!fullLoanData) return null;

          // Observação: aqui você está passando 4 args.
          // Isso só vai funcionar se seu mapLoanFromDB aceitar essa assinatura.
          return mapLoanFromDB(
            fullLoanData,
            fullLoanData.parcelas,
            undefined,
            []
          );
        })
      );

      // 5️⃣ Filtrar contratos válidos
      const validContracts: Loan[] = hydratedContracts.filter(
        (contract): contract is Loan => {
          if (!contract) return false;

          // 🚫 Não mostrar contratos totalmente pagos
          if (contract.status === LoanStatus.PAID) return false;

          const summary = resolveDebtSummary(contract, contract.installments);
          return summary.pendingCount > 0;
        }
      );

      // 6️⃣ Ordenação inteligente
      const sortedContracts = validContracts.sort((a, b) => {
        const summaryA = resolveDebtSummary(a, a.installments);
        const summaryB = resolveDebtSummary(b, b.installments);

        // Prioriza quem está atrasado
        if (summaryA.hasLateInstallments && !summaryB.hasLateInstallments) return -1;
        if (!summaryA.hasLateInstallments && summaryB.hasLateInstallments) return 1;

        // Depois pelo vencimento mais próximo
        const dateA = summaryA.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const dateB = summaryB.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;

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
    clientContracts,
    loadFullPortalData,
    handleSignDocument,
    handleViewDocument,
    isSigning,

    // compatibilidade
    activeToken: initialToken,
    setActiveToken: () => {},
  };
};