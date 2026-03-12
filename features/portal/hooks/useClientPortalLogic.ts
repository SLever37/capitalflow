import { useState, useEffect, useCallback } from 'react';
import { portalService } from '../../../services/portal.service';
import { mapLoanFromDB } from '../../../services/adapters/loanAdapter';
import { Loan, LoanStatus } from '../../../types';
import { resolveDebtSummary } from '../mappers/portalDebtRules';

export const useClientPortalLogic = (initialToken: string, initialCode: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Dados do Cliente
  const [loggedClient, setLoggedClient] = useState<any>(null);
  const [clientContracts, setClientContracts] = useState<Loan[]>([]);
  const [portalDocuments, setPortalDocuments] = useState<any[]>([]);

  const [isSigning, setIsSigning] = useState(false);

  const loadFullPortalData = useCallback(async () => {
    if (!initialToken || !initialCode) return;

    setIsLoading(true);
    setPortalError(null);

    try {
      // 1️⃣ Buscar dados do cliente usando token e code
      const clientData = await portalService.fetchClientByPortal(initialToken, initialCode);

      if (!clientData) {
        throw new Error('Dados do cliente não encontrados.');
      }

      setLoggedClient({
        id: clientData.id,
        name: clientData.name,
        document: clientData.document || '',
        phone: clientData.phone,
        email: clientData.email,
      });

      // 2️⃣ Buscar todos contratos do cliente usando token e code
      const rawContractsList = await portalService.fetchClientContractsByPortal(initialToken, initialCode);

      // 3️⃣ Buscar detalhes do contrato principal (o que o token representa)
      // O requisito pede para usar portal_get_full_loan, portal_get_parcels e portal_get_signals
      const fullLoanData = await portalService.fetchFullLoanByPortal(initialToken, initialCode);
      const { installments, signals } = await portalService.fetchLoanDetailsByPortal(initialToken, initialCode);

      // 4️⃣ Hidratar os contratos. 
      // Se houver apenas um contrato (o principal), usamos os detalhes carregados.
      const hydratedContracts = await Promise.all(
        rawContractsList.map(async (contractHeader: any) => {
          // Se for o contrato principal, usamos os dados já carregados
          if (fullLoanData && contractHeader.id === fullLoanData.id) {
            const loanWithSignals = { ...fullLoanData, paymentSignals: signals };
            return mapLoanFromDB(
              loanWithSignals,
              installments,
              fullLoanData.acordo_ativo,
              fullLoanData.parcelas_acordo
            );
          }
          
          // Para outros contratos, se houver apenas um na lista, assumimos que é o principal
          if (fullLoanData && rawContractsList.length === 1) {
             const loanWithSignals = { ...fullLoanData, paymentSignals: signals };
             return mapLoanFromDB(loanWithSignals, installments, fullLoanData.acordo_ativo, fullLoanData.parcelas_acordo);
          }

          return null;
        })
      );

      // 5️⃣ Filtrar contratos válidos
      const validContracts: Loan[] = hydratedContracts
        .filter((contract): contract is Loan => {
          if (!contract) return false;

          // Se houver acordo ativo, a dívida é baseada nos termos do acordo (Suporta ACTIVE e ATIVO)
          if (contract.activeAgreement && (contract.activeAgreement.status === 'ACTIVE' || contract.activeAgreement.status === 'ATIVO')) {
            // Se o acordo está ativo, não filtramos pelo status PAID do contrato principal,
            // pois o contrato pode estar "pago" mas o acordo ainda estar em andamento.
            // A lógica de dívida será resolvida pelo summary.
            return true;
          }

          // 🚫 Não mostrar contratos totalmente pagos (Suporta PAID e PAGO)
          if (contract.status === LoanStatus.PAID || contract.status === LoanStatus.PAGO) return false;

          const summary = resolveDebtSummary(
            contract,
            contract.installments
          );

          return true; // Permitir que o contrato apareça mesmo se o resumo de dívida estiver zerado (ex: quitado)
        });

      // 6️⃣ Ordenação inteligente
      const sortedContracts = validContracts.sort((a, b) => {
        const summaryA = resolveDebtSummary(a, a.installments);
        const summaryB = resolveDebtSummary(b, b.installments);

        // Prioriza quem está atrasado
        if (summaryA.hasLateInstallments && !summaryB.hasLateInstallments)
          return -1;
        if (!summaryA.hasLateInstallments && summaryB.hasLateInstallments)
          return 1;

        // Depois pelo vencimento mais próximo
        const dateA =
          summaryA.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const dateB =
          summaryB.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;

        return dateA - dateB;
      });

      setClientContracts(sortedContracts);

      // 7️⃣ Buscar documentos
      try {
        const docs = await portalService.listDocuments(initialToken, initialCode);
        setPortalDocuments(docs);
      } catch (docErr) {
        console.error('Erro ao buscar documentos:', docErr);
      }

    } catch (err: any) {
      console.error('Portal Load Error:', err);
      setPortalError(
        err?.message || 'Não foi possível carregar os dados do portal.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [initialToken, initialCode]);

  useEffect(() => {
    loadFullPortalData();
  }, [loadFullPortalData, initialToken, initialCode]);

  const handleSignDocument = async (docId: string, role: string = 'DEVEDOR') => {
    if (!loggedClient) return;
    setIsSigning(true);
    try {
      // 1️⃣ Verificar campos faltantes
      const missingInfo = await portalService.docMissingFields(docId) as any;
      
      if (missingInfo && missingInfo.missing && missingInfo.missing.length > 0) {
        // Se houver campos faltantes, poderíamos abrir um modal para preencher.
        // Por enquanto, vamos apenas alertar ou tentar preencher automaticamente se possível.
        console.log('Campos faltantes:', missingInfo.missing);
        
        // Exemplo: se faltar 'documento', podemos tentar enviar o que temos
        const patch: any = {};
        if (missingInfo.missing.includes('documento') && loggedClient.document) {
          patch.documento = loggedClient.document;
        }
        if (missingInfo.missing.includes('nome') && loggedClient.name) {
          patch.nome = loggedClient.name;
        }

        if (Object.keys(patch).length > 0) {
          await portalService.updateDocumentSnapshotFields(docId, patch);
        } else {
          alert('Existem informações faltantes no seu cadastro para assinar este documento. Por favor, entre em contato com o suporte.');
          setIsSigning(false);
          return;
        }
      }

      let ip = '0.0.0.0';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const d = await res.json();
        ip = d.ip;
      } catch {}

      await portalService.signDocument(
        initialToken,
        initialCode,
        docId,
        role,
        loggedClient.name,
        loggedClient.document,
        ip,
        navigator.userAgent
      );
      
      // Recarregar dados para atualizar status
      await loadFullPortalData();
      alert('Documento assinado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao assinar:', err);
      alert('Falha ao assinar documento: ' + err.message);
    } finally {
      setIsSigning(false);
    }
  };

  const handleViewDocument = async (docId: string) => {
    try {
      const doc = await portalService.fetchDocument(initialToken, initialCode, docId) as any;
      if (doc && doc.view_token) {
        // Abrir em nova aba ou modal de visualização
        window.open(`/portal/document/${doc.view_token}`, '_blank');
      }
    } catch (err) {
      console.error('Erro ao visualizar documento:', err);
    }
  };

  return {
    isLoading,
    portalError,
    loggedClient,
    clientContracts,
    portalDocuments,
    loadFullPortalData,
    handleSignDocument,
    handleViewDocument,
    isSigning,

    // compatibilidade
    activeToken: initialToken,
    setActiveToken: () => {},
  };
};