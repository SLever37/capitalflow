// src/features/portal/hooks/useClientPortalLogic.ts
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

  // ✅ NOVO: Bundle com detalhes completos de TODOS os contratos do cliente
  // Cada item = { loan, installments, signals }
  const [contractsBundle, setContractsBundle] = useState<any[]>([]);

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
      const clientData =
        (entryLoan as any)?.clients || (await portalService.fetchClientById(clientId));
      if (!clientData?.id) throw new Error('Dados do cliente não encontrados.');

      setLoggedClient({
        id: clientData.id,
        name: clientData.name,
        document: clientData.document || '',
        phone: clientData.phone,
        email: clientData.email,
      });

      // 3. Lista de contratos do cliente (NÃO misturar com outro cliente)
      // Deve buscar pelo client_id retornado do contrato validado pelo token.
      const rawContracts = await portalService.fetchClientContracts(clientData.id);

      // 4. Monta lista leve (para UI / dropdown / etc.)
      const mappedContracts: Loan[] = rawContracts.map((c: any) =>
        mapLoanFromDB(c, [clientData])
      );
      setClientContracts(mappedContracts);

      // 5. ✅ Carrega detalhes completos (parcelas/sinais) de TODOS os contratos
      const bundles: any[] = [];
      for (const c of rawContracts) {
        const loanId = (c as any)?.id;
        if (!loanId) continue;

        try {
          const { installments: rawInst, signals } = await portalService.fetchLoanDetails(loanId);
          const mapped = mapLoanFromDB(c, rawInst, undefined, []);
          (mapped as any).paymentSignals = signals;
          (mapped as any).portal_token = (c as any).portal_token || null;

          bundles.push({
            loan: mapped,
            installments: mapped.installments || [],
            signals,
          });
        } catch {
          // ignora contrato com erro sem quebrar o portal inteiro
        }
      }
      setContractsBundle(bundles);
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
        alert('Não há documentos pendentes de assinatura para este contrato.');
        return;
      }

      // Redireciona para a página de assinatura pública do sistema
      const url = `${window.location.origin}/?legal_sign=${doc.view_token}&role=DEVEDOR`;
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      alert('Erro ao acessar documento.');
    } finally {
      setIsSigning(false);
    }
  };

  return {
    isLoading,
    portalError,
    loggedClient,
    clientContracts,
    contractsBundle, // ✅ exportado
    loadFullPortalData,
    handleSignDocument,
    isSigning,
  };
};