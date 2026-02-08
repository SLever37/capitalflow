import { useState, useEffect, useCallback } from 'react';
import { portalService } from '../../../services/portal.service';
import { mapLoanFromDB } from '../../../services/adapters/loanAdapter';
import { Loan, Installment } from '../../../types';

export const useClientPortalLogic = (initialToken: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Dados
  const [loan, setLoan] = useState<Loan | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [clientContracts, setClientContracts] = useState<any[]>([]);
  const [loggedClient, setLoggedClient] = useState<any>(null);

  // Token ativo (fonte da verdade)
  const [activeToken, setActiveToken] = useState<string>(initialToken);

  // Estado auxiliar
  const [isSigning, setIsSigning] = useState(false);

  const loadPortalData = useCallback(async (token: string) => {
    if (!token) return;

    setIsLoading(true);
    setPortalError(null);

    try {
      // A) contrato pelo TOKEN (público)
      const rawLoan = await portalService.fetchLoanByToken(token);

      // ✅ FIX: clientId vem SEMPRE do campo da tabela contratos (não depende do embed)
      const clientId: string | null = (rawLoan as any)?.client_id ?? null;
      if (!clientId) throw new Error('Contrato sem cliente associado (client_id ausente).');

      // B) dados do cliente (preferir embed, mas com fallback seguro)
      const embeddedClient = (rawLoan as any)?.clients ?? null;
      const clientData =
        embeddedClient && typeof embeddedClient === 'object'
          ? embeddedClient
          : await portalService.fetchClientById(clientId);

      if (!clientData?.id) throw new Error('Dados do cliente não encontrados.');

      setLoggedClient({
        id: clientData.id,
        name: clientData.name,
        document: clientData.document || '',
        phone: clientData.phone,
      });

      // C) detalhes do contrato
      const { installments: rawInst, signals } = await portalService.fetchLoanDetails((rawLoan as any).id);

      // D) mapeia
      const mappedLoan = mapLoanFromDB(rawLoan, rawInst, undefined, []);
      (mappedLoan as any).paymentSignals = signals;
      (mappedLoan as any).portal_token = token;

      setLoan(mappedLoan);
      setInstallments(mappedLoan.installments);

      // E) lista contratos do MESMO cliente (com filtro defensivo)
      const contracts = await portalService.fetchClientContracts(clientId);
      const safeContracts = (contracts || []).filter((c: any) => String(c.client_id) === String(clientId));

      setClientContracts(safeContracts);

      // ✅ se a lista vier vazia (erro de dados), não mostra dropdown com lixo
      if (!safeContracts.length) {
        // não é “erro fatal”, mas evita mostrar coisas erradas
        // (se quiser, você pode comentar essas 2 linhas)
        // setPortalError('Falha ao listar contratos.');
      }
    } catch (err: any) {
      console.error('Portal Load Error:', err);
      setPortalError(err?.message || 'Não foi possível carregar o contrato.');
      setLoan(null);
      setInstallments([]);
      setClientContracts([]);
      setLoggedClient(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeToken) loadPortalData(activeToken);
  }, [activeToken, loadPortalData]);

  const handleSwitchContract = (newToken: string) => {
    if (!newToken || newToken === activeToken) return;

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('portal', newToken);
    window.history.pushState({}, '', newUrl.toString());

    setActiveToken(newToken);
  };

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

    loan,
    installments,
    loggedClient,
    clientContracts,

    activeToken,
    setActiveToken: handleSwitchContract,

    loadFullPortalData: () => loadPortalData(activeToken),
    handleSignDocument,
    handleViewDocument,
    isSigning,
  };
};