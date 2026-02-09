
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
      // Tenta listar todos. Se falhar (RLS/Permissão), usa apenas o atual (Fallback)
      let rawContractsList: any[] = [];
      try {
          rawContractsList = await portalService.fetchClientContracts(clientId);
      } catch (e) {
          console.warn("Aviso Portal: Falha ao listar múltiplos contratos (provável restrição RLS). Carregando apenas o atual.");
          rawContractsList = [entryLoan];
      }

      // Se a lista vier vazia por algum motivo estranho, garante o atual
      if (rawContractsList.length === 0) {
          rawContractsList = [entryLoan];
      }
      
      // 4. Hidratação Profunda (Carregar parcelas e detalhes para CADA contrato)
      const hydratedContracts: Loan[] = await Promise.all(
        rawContractsList.map(async (contractHeader: any) => {
            try {
                // Se for o contrato de entrada, já temos os dados? Não, fetchLoanByToken traz JOIN, mas fetchClientContracts não.
                // Mas se caiu no catch acima, rawContractsList[0] é entryLoan (que tem parcelas via fetchLoanDetails?) Não, fetchLoanByToken é básico.
                
                // Vamos buscar fresh data para garantir
                const { data: fullLoanData, error } = await import('../../../lib/supabase').then(m => 
                    m.supabase.from('contratos')
                    .select('*, parcelas(*), sinalizacoes_pagamento(*)')
                    .eq('id', contractHeader.id)
                    .single()
                );
                
                // Se falhar (ex: RLS bloqueia ID direto), mas é o contrato do token, usamos o entryLoan se ele tiver dados suficientes
                if (error || !fullLoanData) {
                    if (contractHeader.id === entryLoan.id) {
                         // Fallback final: Buscar parcelas isoladamente se o select full falhar
                         const details = await portalService.fetchLoanDetails(entryLoan.id);
                         return mapLoanFromDB(entryLoan, details.installments, undefined, []);
                    }
                    return null;
                }

                return mapLoanFromDB(
                    fullLoanData, 
                    fullLoanData.parcelas, 
                    undefined, // acordos (se necessário, expandir query)
                    [] 
                );
            } catch (innerErr) {
                console.warn(`Erro ao hidratar contrato ${contractHeader.id}`, innerErr);
                return null;
            }
        })
      );

      // Filtra nulos e ordena por status (atrasados primeiro)
      const validContracts = hydratedContracts.filter(Boolean) as Loan[];
      
      // Ordenação Inteligente
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
