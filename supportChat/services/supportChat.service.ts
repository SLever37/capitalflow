
import { supabase } from '../../lib/supabase';
import { generateUUID } from '../../utils/generators';
import { SupportMessage, TicketStatus, SupportTicket } from '../types/supportChat.types';

export const supportChatService = {
    // --- TICKETS ---
    async getTicketStatus(loanId: string): Promise<SupportTicket | null> {
        const { data } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('loan_id', loanId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        return data;
    },

    async createOrOpenTicket(loanId: string): Promise<SupportTicket> {
        const existing = await this.getTicketStatus(loanId);
        if (existing && existing.status === 'OPEN') return existing;

        const { data, error } = await supabase
            .from('support_tickets')
            .insert({
                id: generateUUID(),
                loan_id: loanId,
                status: 'OPEN'
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async closeTicket(ticketId: string, closedBy: string) {
        return await supabase
            .from('support_tickets')
            .update({ 
                status: 'CLOSED', 
                closed_at: new Date().toISOString(),
                closed_by: closedBy
            })
            .eq('id', ticketId);
    },

    // --- MESSAGES ---
    async sendMessage(payload: Partial<SupportMessage>) {
        // Validação de segurança: Ticket deve estar aberto
        const ticket = await this.getTicketStatus(payload.loan_id!);
        if (ticket?.status === 'CLOSED' && payload.sender_type !== 'OPERATOR') {
            throw new Error("Atendimento encerrado. Aguarde o operador.");
        }

        return await supabase.from('mensagens_suporte').insert({
            id: generateUUID(),
            created_at: new Date().toISOString(),
            ...payload
        });
    },

    async getMessages(loanId: string) {
        const { data } = await supabase
            .from('mensagens_suporte')
            .select('*')
            .eq('loan_id', loanId)
            .order('created_at', { ascending: true });
        return data as SupportMessage[];
    },

    async markAsRead(loanId: string, userId: string) {
        await supabase
            .from('mensagens_suporte')
            .update({ read_at: new Date().toISOString() })
            .eq('loan_id', loanId)
            .neq('profile_id', userId)
            .is('read_at', null);
    },

    // --- STORAGE ---
    async uploadMedia(file: Blob, folder: string): Promise<string> {
        const fileName = `${folder}/${Date.now()}_${generateUUID()}`;
        const { error } = await supabase.storage
            .from('chat-media')
            .upload(fileName, file);
        
        if (error) throw error;
        
        const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName);
        return data.publicUrl;
    }
};