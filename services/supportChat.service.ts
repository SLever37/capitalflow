import { supabase } from '../lib/supabase';
import { generateUUID } from '../utils/generators';

export interface SupportMessage {
    id: string;
    profile_id: string;
    loan_id: string;
    sender: 'CLIENT' | 'OPERATOR';
    text: string;
    created_at: string;
    read: boolean;
    client_name?: string;
}

export const supportChatService = {
    async sendMessage(profileId: string, loanId: string, sender: 'CLIENT' | 'OPERATOR', text: string) {
        const { error } = await supabase.from('mensagens_suporte').insert({
            id: generateUUID(),
            profile_id: profileId,
            loan_id: loanId,
            sender,
            text,
            created_at: new Date().toISOString(),
            read: false
        });
        if (error) throw error;
    },

    async getMessages(loanId: string) {
        const { data, error } = await supabase
            .from('mensagens_suporte')
            .select('*')
            .eq('loan_id', loanId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data as SupportMessage[];
    },

    async markAsRead(loanId: string, reader: 'CLIENT' | 'OPERATOR') {
        const senderToMark = reader === 'OPERATOR' ? 'CLIENT' : 'OPERATOR';
        await supabase
            .from('mensagens_suporte')
            .update({ read: true })
            .eq('loan_id', loanId)
            .eq('sender', senderToMark);
    },

    async getActiveChats(profileId: string) {
        const { data, error } = await supabase
            .from('mensagens_suporte')
            .select('loan_id, created_at, text, sender, read, contratos(debtor_name)')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const chatsMap = new Map();
        data.forEach((m: any) => {
            if (!chatsMap.has(m.loan_id)) {
                chatsMap.set(m.loan_id, {
                    loanId: m.loan_id,
                    lastMessage: m.text,
                    timestamp: m.created_at,
                    clientName: m.contratos?.debtor_name || 'Cliente',
                    unreadCount: m.sender === 'CLIENT' && !m.read ? 1 : 0
                });
            } else if (m.sender === 'CLIENT' && !m.read) {
                chatsMap.get(m.loan_id).unreadCount++;
            }
        });

        return Array.from(chatsMap.values());
    }
};