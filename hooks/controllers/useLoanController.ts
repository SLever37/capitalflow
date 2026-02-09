
import { supabase } from '../../lib/supabase';
import { contractsService } from '../../services/contracts.service';
import { demoService } from '../../services/demo.service';
import { ledgerService } from '../../services/ledger.service';
import { getOrCreatePortalLink } from '../../utils/portalLink';
import { Loan, UserProfile, CapitalSource, Client, LedgerEntry } from '../../types';

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

  const handleSaveLoan = async (loan: Loan) => {
    if (!activeUser) return;
    if (activeUser.id === 'DEMO') {
        demoService.handleSaveLoan(loan, ui.editingLoan, sources, setSources, loans, setLoans, showToast);
        ui.closeModal(); ui.setEditingLoan(null); return;
    }
    try {
        await contractsService.saveLoan(loan, activeUser, sources, ui.editingLoan);
        showToast(ui.editingLoan ? 'Contrato Atualizado!' : 'Contrato Salvo!', 'success'); 
        ui.closeModal(); 
        ui.setEditingLoan(null); 
        await fetchFullData(activeUser.id);
    } catch (e: any) { showToast(e.message || "Erro desconhecido ao salvar", "error"); }
  };

  const handleSaveNote = async () => {
      if (!activeUser || !ui.noteModalLoan) return;
      if (activeUser.id === 'DEMO') {
          setLoans(loans.map(l => l.id === ui.noteModalLoan?.id ? { ...l, notes: ui.noteText } : l));
          showToast("Anotação salva (Demo)", "success"); ui.closeModal(); ui.setNoteText(''); return;
      }
      try { 
          await contractsService.saveNote(ui.noteModalLoan.id, ui.noteText); 
          showToast("Anotação salva com sucesso!"); 
          ui.closeModal(); 
          ui.setNoteText(''); 
          await fetchFullData(activeUser.id);
      } catch (e) { showToast("Erro ao salvar anotação", "error"); }
  };

  const handleReviewSignal = async (signalId: string, nextStatus: 'APROVADO' | 'NEGADO') => {
      if (!activeUser) return;
      try {
          const note = window.prompt(nextStatus === 'APROVADO' ? 'Observação (opcional):' : 'Motivo/observação (opcional):') || null;
          const { error } = await supabase.from('sinalizacoes_pagamento').update({ status: nextStatus, reviewed_at: new Date().toISOString(), review_note: note }).eq('id', signalId).eq('profile_id', activeUser.id);
          if (error) throw error;
          if (activeUser.id) await fetchFullData(activeUser.id);
          showToast(nextStatus === 'APROVADO' ? 'Pagamento aprovado.' : 'Pagamento negado.', 'success');
      } catch (e: any) { showToast(e?.message || 'Falha ao atualizar status.', 'error'); }
  };

  const handleGenerateLink = async (loan: Loan) => { 
      try {
          // Busca o código de acesso do cliente vinculado para opcionalmente anexar (Magic Link)
          const client = clients.find(c => c.id === loan.clientId);
          const accessCode = (client as any)?.access_code || (client as any)?.accessCode;
          
          // Gera ou recupera URL com token seguro
          let url = await getOrCreatePortalLink(loan.id);
          
          // Se tiver código, anexa como parâmetro adicional (opcional, para auto-preenchimento futuro)
          if (accessCode) {
              url += `&code=${accessCode}`;
          }
          
          await navigator.clipboard.writeText(url);
          showToast("Link do Portal copiado!", "success");
      } catch (e: any) {
          console.error(e);
          showToast("Erro ao gerar link do portal.", "error");
      }
  };

  const openConfirmation = (config: any) => { 
      ui.setRefundChecked(true); // Default checked
      // Força a exibição da opção de estorno para Delete/Archive
      const shouldShowRefund = config.type === 'DELETE' || config.type === 'ARCHIVE';
      
      ui.setConfirmation({
          ...config,
          showRefundOption: config.showRefundOption ?? shouldShowRefund
      });
      ui.openModal('CONFIRMATION'); 
  };
  
  const executeConfirmation = async () => { 
    if (!ui.confirmation || !activeUser) return;
    if (activeUser.id === 'DEMO') {
        demoService.executeAction(ui.confirmation.type, ui.confirmation.target, loans, setLoans, clients, setClients, sources, setSources, showToast);
        ui.closeModal(); return;
    }
    
    try {
        if (ui.confirmation.type === 'REVERSE_TRANSACTION') {
            await ledgerService.reverseTransaction(ui.confirmation.target as LedgerEntry, activeUser, ui.confirmation.extraData);
            showToast("Transação estornada com sucesso!", "success");
        } else {
            // GUARDS: Evita erro de UUID undefined se o objeto target vier incompleto ou for um Evento
            const target = ui.confirmation.target;
            if (!target) throw new Error("Alvo da ação não definido.");
            
            const targetId = typeof target === 'string' ? target : target.id;
            
            if (!targetId || targetId === 'undefined' || typeof targetId !== 'string') {
                throw new Error("ID inválido para execução. Tente recarregar a página.");
            }

            const msg = await ledgerService.executeLedgerAction({ 
                type: ui.confirmation.type, 
                targetId, 
                loan: typeof target === 'string' ? undefined : target, 
                activeUser, 
                sources, 
                refundChecked: ui.confirmation.showRefundOption ? ui.refundChecked : false 
            });
            showToast(msg);
        }
    } catch (err: any) { 
        if(!ui.confirmation.type.includes('DELETE_CLIENT')) showToast("Erro ao executar ação: " + err.message, "error"); 
    } finally { 
        ui.closeModal(); 
        ui.setSelectedLoanId(null); 
        // Catch potential promise rejection here to avoid Uncaught (in promise)
        fetchFullData(activeUser.id).catch(console.error); 
    }
  };

  const openReverseTransaction = (t: LedgerEntry, loan: Loan) => {
      openConfirmation({
          type: 'REVERSE_TRANSACTION',
          target: t,
          title: 'Confirmar Estorno?',
          message: `Deseja desfazer o lançamento de R$ ${t.amount.toFixed(2)}? Isso reajustará o saldo devedor do contrato e o caixa.`,
          extraData: loan
      });
  };

  return {
    handleSaveLoan,
    handleSaveNote,
    handleReviewSignal,
    handleGenerateLink,
    openConfirmation,
    executeConfirmation,
    openReverseTransaction
  };
};
