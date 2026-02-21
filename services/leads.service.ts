import { supabase } from '../lib/supabase';
import { Lead } from '../types';

export const leadsService = {
  async insertLead(lead: Partial<Lead>) {
    const { data, error } = await supabase
      .from('leads_emprestimo')
      .insert([lead])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async listLeads(ownerId?: string) {
    let query = supabase
      .from('leads_emprestimo')
      .select('*')
      .order('created_at', { ascending: false });

    if (ownerId) {
      // Se tiver owner_id, filtra. Se não, traz tudo (ou depende da RLS)
      query = query.eq('owner_id', ownerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Lead[];
  },

  async updateLeadStatus(id: string, status: Lead['status']) {
    const { data, error } = await supabase
      .from('leads_emprestimo')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
