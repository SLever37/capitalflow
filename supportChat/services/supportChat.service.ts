import { supabase } from '../../lib/supabase';
import { generateUUID } from '../../utils/generators';
import type { SupportMessage, SupportTicket } from '../types/supportChat.types';

export const supportChatService = {
  // --- TICKETS ---
  async getTicketStatus(loanId: string): Promise<SupportTicket | null> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // ✅ não explode quando não existe ticket

    if (error) throw error;
    return (data as SupportTicket) ?? null;
  },

  async createOrOpenTicket(loanId: string): Promise<SupportTicket> {
    const existing = await this.getTicketStatus(loanId);
    if (existing && existing.status === 'OPEN') return existing;

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        id: generateUUID(),
        loan_id: loanId,
        status: 'OPEN',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as SupportTicket;
  },

  async closeTicket(ticketId: string, closedBy: string) {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        closed_by: closedBy,
      })
      .eq('id', ticketId);

    if (error) throw error;
    return true;
  },

  // --- MESSAGES ---
  async sendMessage(payload: Partial<SupportMessage>) {
    if (!payload.loan_id) throw new Error('loan_id é obrigatório.');

    // ✅ Garante ticket aberto (se não existir, cria)
    const ticket = await this.getTicketStatus(payload.loan_id);
    if (!ticket) {
      await this.createOrOpenTicket(payload.loan_id);
    } else if (ticket.status === 'CLOSED' && payload.sender_type !== 'OPERATOR') {
      throw new Error('Atendimento encerrado. Aguarde o operador.');
    }

    const { error } = await supabase.from('mensagens_suporte').insert({
      id: generateUUID(),
      loan_id: payload.loan_id,
      profile_id: payload.profile_id ?? null,
      sender_type: payload.sender_type ?? 'CLIENT',
      content: payload.content ?? '',
      type: payload.type ?? 'TEXT',
      file_url: payload.file_url ?? null,
      metadata: payload.metadata ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return true;
  },

  async getMessages(loanId: string) {
    const { data, error } = await supabase
      .from('mensagens_suporte')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as SupportMessage[];
  },

  async markAsRead(loanId: string, userId: string) {
    const { error } = await supabase
      .from('mensagens_suporte')
      .update({ read_at: new Date().toISOString(), read_by: userId })
      .eq('loan_id', loanId)
      .neq('profile_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return true;
  },

  // --- STORAGE ---
  async uploadMedia(file: Blob, folder: string): Promise<string> {
    const fileName = `${folder}/${Date.now()}_${generateUUID()}`;

    const { error: upErr } = await supabase.storage.from('chat-media').upload(fileName, file);
    if (upErr) throw upErr;

    const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName);
    return data.publicUrl;
  },
};