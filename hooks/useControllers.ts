// hooks/useClientController.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { generateUUID } from '../../utils/generators';
import { onlyDigits } from '../../utils/formatters';

type ClientFormData = {
  name: string;
  phone?: string;
  document?: string;
  address?: string;
  notes?: string;
};

export const useClientController = (
  activeUser: UserProfile | null,
  setClients: (v: any[]) => void
) => {
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const fetchClients = useCallback(async () => {
    if (!activeUser?.id) return;

    setIsLoadingClients(true);
    try {
      // ✅ clientes pertencem ao DONO da conta (coluna: owner_id)
      const ownerId = (activeUser as any).supervisor_id || activeUser.id;

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setClients(data || []);
    } catch (e) {
      console.error('[CLIENTS] fetchClients error:', e);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, [activeUser, setClients]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = useCallback(
    async (data: ClientFormData) => {
      if (!activeUser?.id) throw new Error('Usuário não autenticado.');

      // ✅ clientes pertencem ao DONO da conta (coluna: owner_id)
      const ownerId = (activeUser as any).supervisor_id || activeUser.id;

      const name = (data.name || '').trim();
      if (!name) throw new Error('Nome é obrigatório.');

      const document = data.document ? onlyDigits(data.document) : '';
      const phone = data.phone ? onlyDigits(data.phone) : '';

      // 🔒 regra: não pode CPF/CNPJ repetido (por owner)
      if (document && document.length >= 11) {
        const { data: existingByDoc, error } = await supabase
          .from('clientes')
          .select('id, name')
          .eq('owner_id', ownerId)
          .eq('document', document)
          .maybeSingle();

        if (error) throw error;
        if (existingByDoc) throw new Error('Já existe um cliente com este CPF/CNPJ.');
      }

      // 🔒 regra: não pode nome repetido (por owner)
      {
        const { data: existingByName, error } = await supabase
          .from('clientes')
          .select('id, name')
          .eq('owner_id', ownerId)
          .ilike('name', name)
          .maybeSingle();

        if (error) throw error;
        if (existingByName) throw new Error('Já existe um cliente com este nome.');
      }

      const newId = generateUUID();
      const payload: any = {
        id: newId,
        owner_id: ownerId,
        name,
        phone: phone || null,
        document: document || null,
        address: data.address || null,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('clientes').insert(payload);
      if (insertError) throw insertError;

      await fetchClients();
      return newId;
    },
    [activeUser, fetchClients]
  );

  const updateClient = useCallback(
    async (clientId: string, patch: Partial<ClientFormData>) => {
      if (!activeUser?.id) throw new Error('Usuário não autenticado.');

      const ownerId = (activeUser as any).supervisor_id || activeUser.id;

      const updatePayload: any = {};
      if (patch.name !== undefined) updatePayload.name = (patch.name || '').trim();
      if (patch.phone !== undefined) updatePayload.phone = patch.phone ? onlyDigits(patch.phone) : null;
      if (patch.document !== undefined) updatePayload.document = patch.document ? onlyDigits(patch.document) : null;
      if (patch.address !== undefined) updatePayload.address = patch.address || null;
      if (patch.notes !== undefined) updatePayload.notes = patch.notes || null;

      // garante que só edita do mesmo owner
      const { error } = await supabase
        .from('clientes')
        .update(updatePayload)
        .eq('id', clientId)
        .eq('owner_id', ownerId);

      if (error) throw error;

      await fetchClients();
      return true;
    },
    [activeUser, fetchClients]
  );

  const deleteClient = useCallback(
    async (clientId: string) => {
      if (!activeUser?.id) throw new Error('Usuário não autenticado.');

      const ownerId = (activeUser as any).supervisor_id || activeUser.id;

      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clientId)
        .eq('owner_id', ownerId);

      if (error) throw error;

      await fetchClients();
      return true;
    },
    [activeUser, fetchClients]
  );

  return {
    isLoadingClients,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
};