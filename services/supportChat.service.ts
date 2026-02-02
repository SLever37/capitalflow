
import { supabase } from '../lib/supabase';
import { generateUUID } from '../utils/generators';

export interface SupportMessage {
    id: string;
    profile_id: string;
    loan_id: string;
    sender: 'CLIENT' | 'OPERATOR';
    text: string;
    type: 'text' | 'image' | 'audio' | 'file';
    file_url?: string;
    created_at: string;
    read: boolean;
    operator_id?: string; // Added operator_id
}

export const supportChatService = {
    async isOperatorOnline(profileId: string): Promise<boolean> {
        const { data } = await supabase
            .from('perfis')
            .select('last_active_at')
            .eq('id', profileId)
            .single();
        
        if (!data?.last_active_at) return false;
        const lastActive = new Date(data.last_active_at).getTime();
        const now = new Date().getTime();
        // Operador considerado online se teve atividade nos últimos 5 minutos
        return (now - lastActive) < 5 * 60 * 1000;
    },

    // Updated sendMessage signature to accept operator_id
    async sendMessage(params: {
        profileId: string, 
        loanId: string, 
        sender: 'CLIENT' | 'OPERATOR', 
        text: string,
        operator_id?: string, // Added operator_id here
        file?: File,
        type?: 'text' | 'image' | 'audio' | 'file'
    }) {
        let fileUrl = '';
        
        if (params.file) {
            const ext = params.file.name.split('.').pop();
            const path = `chat/${params.loanId}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('documentos').upload(path, params.file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('documentos').getPublicUrl(path);
            fileUrl = data.publicUrl;
        }

        const { error } = await supabase.from('mensagens_suporte').insert({
            id: generateUUID(),
            profile_id: params.profileId,
            loan_id: params.loanId,
            sender: params.sender,
            operator_id: params.operator_id || null, // Persist operator_id
            text: params.text,
            type: params.type || 'text',
            file_url: fileUrl || null,
            created_at: new Date().toISOString(),
            read: false
        });
        
        if (error) throw error;

        // LÓGICA DE BOT: Somente se for Cliente enviando e Operador estiver REALMENTE Offline
        if (params.sender === 'CLIENT') {
            const isOnline = await this.isOperatorOnline(params.profileId);
            if (!isOnline) {
                // Pequeno delay para simular processamento do robô
                setTimeout(() => this.sendAutoReply(params.profileId, params.loanId), 1500);
            }
        }
    },

    async sendAutoReply(profileId: string, loanId: string) {
        const autoText = `[AUTO] Olá! O operador está offline no momento, mas eu sou o assistente CapitalFlow. Nosso sistema processa pagamentos PIX 24h automaticamente. Para este contrato (#${loanId.slice(0,6).toUpperCase()}), você pode consultar os próximos vencimentos no menu 'Plano de Pagamento'. Deixe sua dúvida e retornaremos no horário comercial!`;
        
        await supabase.from('mensagens_suporte').insert({
            id: generateUUID(),
            profile_id: profileId,
            loan_id: loanId,
            sender: 'OPERATOR',
            text: autoText,
            type: 'text',
            created_at: new Date().toISOString(),
            read: false
        });
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
            .eq('sender', senderToMark)
            .eq('read', false);
    },

    async getActiveChats(profileId: string) {
        const { data, error } = await supabase
            .from('mensagens_suporte')
            .select('loan_id, created_at, text, sender, read, type, contratos(debtor_name)')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const chatsMap = new Map();
        data.forEach((m: any) => {
            if (!chatsMap.has(m.loan_id)) {
                chatsMap.set(m.loan_id, {
                    loanId: m.loan_id,
                    lastMessage: m.type !== 'text' ? `[${m.type.toUpperCase()}]` : m.text,
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
