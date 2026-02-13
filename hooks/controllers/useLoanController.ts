// src/hooks/controllers/useLoanController.ts
import { supabase } from '../../lib/supabase';
import { contractsService } from '../../services/contracts.service';
import { demoService } from '../../services/demo.service';
import { ledgerService } from '../../services/ledger.service';
import { getOrCreatePortalLink } from '../../utils/portalLink';
import type { Loan, UserProfile, CapitalSource, Client, LedgerEntry } from '../../types';

const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeOwnerId = (activeUser: UserProfile | null) => {
  if (!activeUser?.id) return null;
  const ownerId = (activeUser as any).supervisor_id || activeUser.id;
  return isUUID(ownerId) ? ownerId : null;
};

export const useLoanController = (
  activeUser: UserProfile | null,
  ui: any,
  sources: CapitalSource[],
  setSources: any,
  loans: Loan[],
  setLoans: any,
  clients: Client[],
  setClients: any,
  fetchFullData: (id: string) => Promise<void>,
  showToast: (msg: string, type?: 'success' | 'error') => void
) => {
  const getOwnerId = () => safeOwnerId(activeUser);

  const handleSaveLoan = async (loan: Loan) => {
    if (!activeUser) return;

    if (activeUser.id === 'DEMO') {
      demoService.handleSaveLoan(loan, ui.editingLoan, sources, setSources, loans, setLoans, showToast);
      ui.closeModal();
      ui.setEditingLoan(null);
      return;
    }

    const ownerId = getOwnerId();
    if (!ownerId) {
      showToast('Perfil inválido. Refaça o login.', 'error');
      return;
    }

    try {
      await contractsService.saveLoan(loan, activeUser, sources, ui.editingLoan);
      showToast(ui.editingLoan ? 'Contrato Atualizado!' : 'Contrato Salvo!', 'success');
      ui.closeModal();
      ui.setEditingLoan(null);
      await fetchFullData(ownerId);
    } catch (e: any) {
      showToast(e?.message || 'Erro desconhecido ao salvar', 'error');
    }
  };

  const handleSaveNote = async () => {
    if (!activeUser || !ui.noteModalLoan) return;

    if (activeUser.id === 'DEMO') {
      setLoans(loans.map((l) => (l.id === ui.noteModalLoan?.id ? { ...l, notes: ui.noteText } : l)));
      showToast('Anotação salva (Demo)', 'success');
      ui.closeModal();
      ui.setNoteText('');
      return;
    }

    const ownerId = getOwnerId();
    if (!ownerId) {
      showToast('Perfil inválido. Refaça o login.', 'error');
      return;
    }

    try {
      await contractsService.saveNote(ui.noteModalLoan.id, ui.noteText);
      showToast('Anotação salva com sucesso!', 'success');
      ui.closeModal();
      ui.setNoteText('');
      await fetchFullData(ownerId);
    } catch (e: any) {
      showToast('Erro ao salvar anotação', 'error');
    }
  };

  const handleReviewSignal = async (signalId: string, nextStatus: 'APROVADO' | 'NEGADO') => {
    if (!activeUser) return;

    const ownerId = getOwnerId();
    if (!ownerId) {
      showToast('Perfil inválido. Refaça o login.', 'error');
      return;
    }

    try {
      const note =
        window.prompt(nextStatus === 'APROVADO' ? 'Observação (opcional):' : 'Motivo/observação (opcional):') || null;

      // ✅ sinalizacoes_pagamento: filtra por profile_id = DONO (ownerId)
      const { error } = await supabase
        .from('sinalizacoes_pagamento')
        .update({
          status: nextStatus,
          reviewed_at: new Date().toISOString(),
          review_note: note,
        })
        .eq('id', signalId)
        .eq('profile_id', ownerId);

      if (error) throw error;

      await fetchFullData(ownerId);
      showToast(nextStatus === 'APROVADO' ? 'Pagamento aprovado.' : 'Pagamento negado.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Falha ao atualizar status.', 'error');
    }
  };

  const handleGenerateLink = async (loan: Loan) => {
    try {
      const client = clients.find((c) => c.id === loan.clientId);
      const accessCode = (client as any)?.access_code || (client as any)?.accessCode;

      let url = await getOrCreatePortalLink(loan.id);
      if (accessCode) url += `&code=${accessCode}`;

      await navigator.clipboard.writeText(url);
      showToast('Link do Portal copiado!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Erro ao gerar link do portal.', 'error');
    }
  };

  const openConfirmation = (config: any) => {
    ui.setRefundChecked(true);

    // Exibe estorno por padrão em DELETE/ARCHIVE
    const shouldShowRefund = config.type === 'DELETE' || config.type === 'ARCHIVE';

    ui.setConfirmation({
      ...config,
      showRefundOption: config.showRefundOption ?? shouldShowRefund,
    });

    ui.openModal('CONFIRMATION');
  };

  const executeConfirmation = async () => {
    if (!ui.confirmation || !activeUser) return;

    if (activeUser.id === 'DEMO') {
      demoService.executeAction(
        ui.confirmation.type,
        ui.confirmation.target,
        loans,
        setLoans,
        clients,
        setClients,
        sources,
        setSources,
        showToast
      );
      ui.closeModal();
      return;
    }

    const ownerId = getOwnerId();
    if (!ownerId) {
      showToast('Perfil inválido. Refaça o login.', 'error');
      return;
    }

    try {
      if (ui.confirmation.type === 'REVERSE_TRANSACTION') {
        await ledgerService.reverseTransaction(
          ui.confirmation.target as LedgerEntry,
          activeUser,
          ui.confirmation.extraData
        );
        showToast('Transação estornada com sucesso!', 'success');
      } else {
        const target = ui.confirmation.target;
        if (!target) throw new Error('Alvo da ação não definido.');

        const targetId = typeof target === 'string' ? target : target.id;

        if (!targetId || targetId === 'undefined' || typeof targetId !== 'string') {
          throw new Error('ID inválido para execução. Tente recarregar a página.');
        }

        const msg = await ledgerService.executeLedgerAction({
          type: ui.confirmation.type,
          targetId,
          loan: typeof target === 'string' ? undefined : target,
          activeUser,
          sources,
          refundChecked: ui.confirmation.showRefundOption ? ui.refundChecked : false,
        });

        showToast(msg, 'success');
      }
    } catch (err: any) {
      if (!String(ui.confirmation.type || '').includes('DELETE_CLIENT')) {
        showToast('Erro ao executar ação: ' + (err?.message || 'desconhecido'), 'error');
      }
    } finally {
      ui.closeModal();
      ui.setSelectedLoanId(null);
      await fetchFullData(ownerId);
    }
  };

  const openReverseTransaction = (t: LedgerEntry, loan: Loan) => {
    openConfirmation({
      type: 'REVERSE_TRANSACTION',
      target: t,
      title: 'Confirmar Estorno?',
      message: `Deseja desfazer o lançamento de R$ ${t.amount.toFixed(
        2
      )}? Isso reajustará o saldo devedor do contrato e o caixa.`,
      extraData: loan,
    });
  };

  return {
    handleSaveLoan,
    handleSaveNote,
    handleReviewSignal,
    handleGenerateLink,
    openConfirmation,
    executeConfirmation,
    openReverseTransaction,
  };
};