import type React from 'react';
import { supabase } from '../../lib/supabase';
import { demoService } from '../../services/demo.service';
import { Client, UserProfile } from '../../types';
import {
  onlyDigits,
  isTestClientName,
  maskPhone,
  normalizeBrazilianPhone,
} from '../../utils/formatters';
import { isValidCPForCNPJ } from '../../utils/validators';
import { generateUniqueAccessCode, generateUniqueClientNumber } from '../../utils/generators';
import { clientAvatarService } from '../../services/clientAvatar.service';

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
      ui.setClientDraftAccessCode(client.access_code || '');
      ui.setClientDraftNumber(client.client_number || '');
      ui.setClientForm({
        name: client.name,
        phone: maskPhone(client.phone),
        document: client.document,
        email: client.email || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        notes: client.notes || '',
        fotoUrl: (client as any).foto_url || (client as any).fotoUrl || '',
      });
    } else {
      const codes = new Set(clients.map((c) => String((c as any).access_code || '').trim()).filter(Boolean));
      const nums = new Set(clients.map((c) => String((c as any).client_number || '').trim()).filter(Boolean));

      ui.setClientDraftAccessCode(generateUniqueAccessCode(codes));
      ui.setClientDraftNumber(generateUniqueClientNumber(nums));
      ui.setClientForm({
        name: '',
        phone: '',
        document: '',
        email: '',
        address: '',
        city: '',
        state: '',
        notes: '',
        fotoUrl: '',
      });
    }

    ui.openModal('CLIENT_FORM');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ui.editingClient) return;

    ui.setIsSaving(true);
    try {
      const publicUrl = await clientAvatarService.uploadAvatar(file, ui.editingClient.id);
      await clientAvatarService.updateClientPhoto(ui.editingClient.id, publicUrl);

      ui.setClientForm({ ...ui.clientForm, fotoUrl: publicUrl });
      showToast('Foto atualizada!', 'success');

      if (activeUser?.id) await fetchFullData(activeUser.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      ui.setIsSaving(false);
    }
  };

  const handleSaveClient = async () => {
    if (!activeUser) return;

    const { name, phone, document, email, address, city, state, notes } = ui.clientForm;

    if (!name.trim()) { showToast('Nome é obrigatório.', 'error'); return; }
    if (!phone.trim()) { showToast('Telefone é obrigatório.', 'error'); return; }

    // valida CPF/CNPJ se informado
    if (document && !isValidCPForCNPJ(document)) {
      showToast('CPF ou CNPJ inválido.', 'error');
      return;
    }

    if (ui.isSaving) return;

    if (activeUser.id === 'DEMO') {
      demoService.handleSaveClient(ui.clientForm, ui.editingClient, clients, setClients, activeUser, showToast);
      ui.closeModal();
      return;
    }

    ui.setIsSaving(true);

    try {
      const ownerId = (activeUser as any).supervisor_id || activeUser.id;

      const cleanDoc = onlyDigits(document);
      const cleanPhone = onlyDigits(normalizeBrazilianPhone(phone));

      // --- DUPLICIDADE CPF/CNPJ (não permite, exceto legado 00000000000) ---
      if (cleanDoc && cleanDoc !== '00000000000' && cleanDoc.length >= 11) {
        let q = supabase
          .from('clientes')
          .select('id, name')
          .eq('owner_id', ownerId)
          .eq('document', cleanDoc);

        if (ui.editingClient?.id) q = q.neq('id', ui.editingClient.id);

        const { data: existing, error: dupErr } = await q.maybeSingle();
        if (dupErr) throw dupErr;

        if (existing) {
          showToast(`Documento já cadastrado para: ${existing.name}.`, 'error');
          ui.setIsSaving(false);
          return;
        }
      }

      // --- DUPLICIDADE NOME (regra que você pediu) ---
      const cleanName = String(name || '').trim();
      if (cleanName && !isTestClientName(cleanName)) {
        let qn = supabase
          .from('clientes')
          .select('id, name')
          .eq('owner_id', ownerId)
          .ilike('name', cleanName);

        if (ui.editingClient?.id) qn = qn.neq('id', ui.editingClient.id);

        const { data: existingName, error: nameErr } = await qn.maybeSingle();
        if (nameErr) throw nameErr;

        if (existingName) {
          showToast(`Já existe cliente com esse nome: ${existingName.name}.`, 'error');
          ui.setIsSaving(false);
          return;
        }
      }

      const id = ui.editingClient ? ui.editingClient.id : crypto.randomUUID();

      const payload: any = {
        id,
        owner_id: ownerId,           // ✅ clientes usa owner_id
        name: cleanName,
        phone: cleanPhone || null,   // ✅ guarda limpo (só dígitos)
        document: cleanDoc || null,  // ✅ guarda limpo (só dígitos)
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        notes: notes || null,
      };

      if (!ui.editingClient) {
        payload.access_code = ui.clientDraftAccessCode;
        payload.client_number = ui.clientDraftNumber;
        payload.created_at = new Date().toISOString();
      }

      const { error } = await supabase.from('clientes').upsert(payload);
      if (error) throw error;

      showToast(ui.editingClient ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
      ui.closeModal();
      await fetchFullData(activeUser.id);
    } catch (e: any) {
      showToast('Erro ao salvar cliente: ' + (e?.message || 'erro desconhecido'), 'error');
    } finally {
      ui.setIsSaving(false);
    }
  };

  const handlePickContact = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel', 'email', 'address'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);

        if (contacts.length) {
          const contact = contacts[0];
          const name = contact.name?.[0] || '';
          const tel = contact.tel?.[0] || '';
          const email = contact.email?.[0] || '';
          const addressObj = contact.address?.[0];

          let addressStr = '';
          let cityStr = '';
          let stateStr = '';
          if (addressObj) {
            addressStr = [addressObj.addressLine, addressObj.street].filter(Boolean).join(', ');
            cityStr = addressObj.city || '';
            stateStr = addressObj.region || '';
          }

          ui.setClientForm((prev: any) => ({
            ...prev,
            name: name || prev.name,
            phone: tel ? maskPhone(tel) : prev.phone,
            email: email || prev.email,
            address: addressStr || prev.address,
            city: cityStr || prev.city,
            state: stateStr || prev.state,
          }));
        }
      } catch {
        // ignore cancel
      }
    } else {
      showToast('Importação indisponível neste dispositivo.', 'error');
    }
  };

  // Bulk Actions
  const toggleBulkDeleteMode = () => {
    ui.setIsBulkDeleteMode(!ui.isBulkDeleteMode);
    ui.setSelectedClientsToDelete([]);
  };

  const toggleClientSelection = (id: string) => {
    ui.setSelectedClientsToDelete((prev: string[]) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const executeBulkDelete = async () => {
    const count = ui.selectedClientsToDelete.length;
    if (count === 0) return;

    if (!confirm(`Tem certeza que deseja excluir ${count} clientes? Esta ação removerá também o histórico e contratos vinculados.`)) return;

    if (activeUser?.id === 'DEMO') {
      showToast(`${count} clientes removidos (Demo)`, 'success');
      ui.setIsBulkDeleteMode(false);
      ui.setSelectedClientsToDelete([]);
      return;
    }

    try {
      const ownerId = (activeUser as any).supervisor_id || activeUser.id;

      const { error } = await supabase
        .from('clientes')
        .delete()
        .in('id', ui.selectedClientsToDelete)
        .eq('owner_id', ownerId); // ✅ clientes usa owner_id

      if (error) throw error;

      showToast(`${count} clientes removidos com sucesso!`, 'success');
      await fetchFullData(activeUser!.id);
      ui.setIsBulkDeleteMode(false);
      ui.setSelectedClientsToDelete([]);
    } catch (e: any) {
      showToast('Erro ao excluir clientes: ' + e.message, 'error');
    }
  };

  return {
    openClientModal,
    handleSaveClient,
    handleAvatarUpload,
    handlePickContact,
    toggleBulkDeleteMode,
    toggleClientSelection,
    executeBulkDelete,
  };
};