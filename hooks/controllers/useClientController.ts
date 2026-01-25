
import { supabase } from '../../lib/supabase';
import { demoService } from '../../services/demo.service';
import { Client, UserProfile } from '../../types';
import { onlyDigits, isTestClientName, maskPhone, normalizeBrazilianPhone } from '../../utils/formatters';
import { isValidCPForCNPJ } from '../../utils/validators';
import { generateUniqueAccessCode, generateUniqueClientNumber } from '../../utils/generators';
import { ledgerService } from '../../services/ledger.service';

export const useClientController = (
  activeUser: UserProfile | null,
  ui: any,
  clients: Client[],
  setClients: any,
  fetchFullData: (id: string) => Promise<void>,
  showToast: (msg: string, type?: 'success' | 'error') => void
) => {

  const openClientModal = (client?: Client) => {
      ui.setEditingClient(client || null);
      if (client) {
          ui.setClientDraftAccessCode(String((client as any).access_code || '').trim());
          ui.setClientDraftNumber(String((client as any).client_number || '').trim());
          ui.setClientForm({ 
              name: client.name, 
              phone: client.phone, 
              document: (client as any).document || (client as any).cpf || (client as any).cnpj || '', 
              email: (client as any).email || '', 
              address: (client as any).address || '', 
              city: (client as any).city || '', 
              state: (client as any).state || '', 
              notes: (client as any).notes || ''
          });
      } else {
          const codes = new Set((clients || []).map(c => String((c as any).access_code || '').trim()).filter(Boolean));
          const nums = new Set((clients || []).map(c => String((c as any).client_number || '').trim()).filter(Boolean));
          ui.setClientDraftAccessCode(generateUniqueAccessCode(codes));
          ui.setClientDraftNumber(generateUniqueClientNumber(nums));
          ui.setClientForm({ name: '', phone: '', document: '', email: '', address: '', city: '', state: '', notes: '' });
      }
      ui.openModal('CLIENT_FORM');
  };

  const handleSaveClient = async () => {
      if (!activeUser) return;
      
      if (!ui.clientForm.name.trim()) {
          showToast("O Nome do cliente é obrigatório.", "error");
          return;
      }

      if (ui.clientForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ui.clientForm.email)) {
          showToast("O e-mail informado é inválido.", "error");
          return;
      }

      if (ui.isSaving) return;
      
      const docClean = onlyDigits(ui.clientForm.document);
      
      if (activeUser.id !== 'DEMO' && !isTestClientName(ui.clientForm.name)) {
        if (!docClean) { showToast('Informe um CPF ou CNPJ válido (ou use nome TESTE para cadastro de teste).', 'error'); return; }
        if (!isValidCPForCNPJ(docClean)) { showToast('CPF/CNPJ inválido. Verifique os dígitos.', 'error'); return; }
      }

      if (activeUser.id === 'DEMO') { 
          demoService.handleSaveClient(ui.clientForm, ui.editingClient, clients, setClients, activeUser, showToast); 
          ui.closeModal(); 
          return; 
      }

      ui.setIsSaving(true);
      try {
          const id = ui.editingClient?.id || crypto.randomUUID();
          
          const payload = { 
              id, 
              profile_id: activeUser.id, 
              name: ui.clientForm.name, 
              phone: ui.clientForm.phone, 
              email: ui.clientForm.email, 
              address: ui.clientForm.address, 
              city: ui.clientForm.city, 
              state: ui.clientForm.state,
              access_code: (() => {
                  const existingCode = (ui.editingClient as any)?.access_code;
                  if (existingCode && String(existingCode).trim().length > 0) return String(existingCode);
                  const draft = String(ui.clientDraftAccessCode || '').trim();
                  if (draft) return draft;
                  const codes = new Set((clients || []).filter(c => String((c as any).id) !== String(id)).map(c => String((c as any).access_code || '').trim()).filter(Boolean));
                  return generateUniqueAccessCode(codes);
              })(),
              client_number: (() => {
                  const existingNum = (ui.editingClient as any)?.client_number;
                  if (existingNum && String(existingNum).trim().length > 0) return String(existingNum);
                  const draft = String(ui.clientDraftNumber || '').trim();
                  if (draft) return draft;
                  const nums = new Set((clients || []).filter(c => String((c as any).id) !== String(id)).map(c => String((c as any).client_number || '').trim()).filter(Boolean));
                  return generateUniqueClientNumber(nums);
              })(),
              cpf: (docClean.length === 11 ? docClean : null), 
              cnpj: (docClean.length === 14 ? docClean : null), 
              document: docClean || null, 
              notes: ui.clientForm.notes, 
              created_at: ui.editingClient ? ui.editingClient.createdAt : new Date().toISOString()
          };
          
          const { error } = await supabase.from('clientes').upsert(payload);
          if (error) { console.error(error); showToast("Erro ao salvar cliente: " + error.message, "error"); } else { showToast("Cliente salvo!", "success"); ui.closeModal(); fetchFullData(activeUser.id); }
      } catch(e: any) { showToast("Erro ao salvar cliente: " + e.message, "error"); } finally { ui.setIsSaving(false); }
  };

  const handlePickContact = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        if (contacts.length) {
          const contact = contacts[0];
          const name = contact.name && contact.name.length > 0 ? contact.name[0] : '';
          let number = contact.tel && contact.tel.length > 0 ? contact.tel[0] : '';
          
          // Uso da normalização inteligente
          const normalizedPhone = normalizeBrazilianPhone(number);
          
          ui.setClientForm((prev: any) => ({ ...prev, name: name || prev.name, phone: normalizedPhone }));
        }
      } catch (ex) {}
    } else { 
        alert("A importação de contatos funciona melhor em dispositivos móveis (Android/Chrome)."); 
    }
  };

  const toggleBulkDeleteMode = () => {
      ui.setIsBulkDeleteMode(!ui.isBulkDeleteMode);
      ui.setSelectedClientsToDelete([]);
  };

  const toggleClientSelection = (clientId: string) => {
      if (ui.selectedClientsToDelete.includes(clientId)) {
          ui.setSelectedClientsToDelete((prev: string[]) => prev.filter(id => id !== clientId));
      } else {
          ui.setSelectedClientsToDelete((prev: string[]) => [...prev, clientId]);
      }
  };

  const executeBulkDelete = async () => {
      if (!activeUser) return;
      if (ui.selectedClientsToDelete.length === 0) { showToast("Nenhum cliente selecionado.", "error"); return; }
      if (activeUser.id === 'DEMO') {
           demoService.executeAction('DELETE_CLIENT', null, [], () => {}, clients, setClients, [], () => {}, showToast);
           ui.setSelectedClientsToDelete([]);
           ui.setIsBulkDeleteMode(false);
           return;
      }

      if (!window.confirm(`Tem certeza que deseja excluir ${ui.selectedClientsToDelete.length} clientes?`)) return;

      try {
          ui.setIsSaving(true);
          const { error } = await supabase.from('clientes').delete().in('id', ui.selectedClientsToDelete).eq('profile_id', activeUser.id);
          if (error) throw error;
          
          showToast(`${ui.selectedClientsToDelete.length} clientes excluídos.`, "success");
          ui.setSelectedClientsToDelete([]);
          ui.setIsBulkDeleteMode(false);
          await fetchFullData(activeUser.id);
      } catch (e: any) {
          showToast("Erro ao excluir (verifique se existem contratos ativos): " + e.message, "error");
      } finally {
          ui.setIsSaving(false);
      }
  };

  return {
    openClientModal,
    handleSaveClient,
    handlePickContact,
    toggleBulkDeleteMode,
    toggleClientSelection,
    executeBulkDelete
  };
};
