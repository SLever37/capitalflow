
import { supabase } from '../lib/supabase';
import { generateUUID } from '../utils/generators';

export interface SupportMessage {
    id: string;
    profile_id: string;
    loan_id: string;
    sender: 'CLIENT' | 'OPERATOR';
    text: string;
    type: 'text' | 'image' | 'audio' | 'file' | 'video_call' | 'voice_call' | 'system';
    file_url?: string;
    created_at: string;
    read: boolean;
    operator_id?: string;
}

export const supportChatService = {
    async isOperatorOnline(profileId: string): Promise<boolean> {
        if (!profileId) return false;
        try {
            const { data } = await supabase
                .from('perfis')
                .select('last_active_at')
                .eq('id', profileId)
                .single();
            
            if (!data?.last_active_at) return false;
            const lastActive = new Date(data.last_active_at).getTime();
            const now = new Date().getTime();
            return (now - lastActive) < 5 * 60 * 1000;
        } catch { return false; }
    },

    async sendMessage(params: {
        profileId: string, 
        loanId: string, 
        sender: 'CLIENT' | 'OPERATOR', 
        text: string,
        operator_id?: string,
        file?: File | Blob,
        type?: SupportMessage['type']
    }) {
        if (!params.profileId || !params.loanId) {
            throw new Error("Identificação do chat incompleta.");
        }

        let fileUrl = '';
        
        if (params.file) {
            const timestamp = Date.now();
            let ext = 'bin';
            const contentType = params.file.type || 'application/octet-stream';

            if (contentType.includes('audio/webm')) ext = 'webm';
            else if (contentType.includes('audio/mp4')) ext = 'm4a';
            else if (contentType.includes('image/')) ext = contentType.split('/')[1] || 'jpg';
            else if (params.file instanceof File) ext = params.file.name.split('.').pop() || 'bin';
            
            const path = `${params.profileId}/chat/${params.loanId}/${timestamp}.${ext}`;
            
            const { error: uploadError } = await supabase.storage
                .from('documentos')
                .upload(path, params.file, {
                    contentType: contentType,
                    upsert: true
                });

            if (uploadError) {
                console.error("Storage Error:", uploadError);
                throw new Error(`Erro no Storage: ${uploadError.message}`);
            }

            const { data } = supabase.storage.from('documentos').getPublicUrl(path);
            fileUrl = data.publicUrl;
        }

        const payload: any = {
            id: generateUUID(),
            profile_id: params.profileId,
            loan_id: params.loanId,
            sender: params.sender,
            text: params.text || '',
            type: params.type || 'text',
            file_url: fileUrl || null,
            created_at: new Date().toISOString(),
            read: false
        };

        if (params.sender === 'OPERATOR' && params.operator_id) {
            payload.operator_id = params.operator_id;
        }

        const { error: dbError } = await supabase.from('mensagens_suporte').insert(payload);
        
        if (dbError) {
            console.error("Database Error:", dbError);
            
            // Tratamento amigável para erro de Constraint ou Schema Cache
            if (dbError.message.includes('mensagens_suporte_type_check')) {
                // FALLBACK: Se o tipo de chamada falhar no banco, envia como texto para não perder o log
                payload.text = `[CHAMADA] ${payload.text}`;
                payload.type = 'text';
                const { error: retryError } = await supabase.from('mensagens_suporte').insert(payload);
                if (retryError) throw new Error(`Erro crítico no banco: ${retryError.message}`);
                console.warn("Mensagem de chamada enviada como fallback de texto devido a restrição de banco.");
            } else if (dbError.message.includes('operator_id')) {
                delete payload.operator_id;
                const { error: retryError } = await supabase.from('mensagens_suporte').insert(payload);
                if (retryError) throw new Error(`Erro ao registrar mensagem sem ID do operador: ${retryError.message}`);
            } else {
                throw new Error(`Erro ao registrar mensagem: ${dbError.message}`);
            }
        }

        // Auto-reply se o operador estiver offline
        if (params.sender === 'CLIENT') {
            const isOnline = await this.isOperatorOnline(params.profileId);
            if (!isOnline) {
                setTimeout(() => this.sendAutoReply(params.profileId, params.loanId), 1500);
            }
        }
    },

    async sendAutoReply(profileId: string, loanId: string) {
        try {
            await supabase.from('mensagens_suporte').insert({
                id: generateUUID(),
                profile_id: profileId,
                loan_id: loanId,
                sender: 'OPERATOR',
                text: `[AUTO] Olá! No momento nosso suporte está offline, mas sua mensagem foi recebida e responderemos assim que possível.`,
                type: 'text',
                created_at: new Date().toISOString(),
                read: false
            });
        } catch (e) {
            console.warn("Falha no envio de auto-reply", e);
        }
    },

    async getMessages(loanId: string) {
        if (!loanId) return [];
        const { data, error } = await supabase
            .from('mensagens_suporte')
            .select('*')
            .eq('loan_id', loanId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []) as SupportMessage[];
    },

    async markAsRead(loanId: string, reader: 'CLIENT' | 'OPERATOR') {
        if (!loanId) return;
        const senderToMark = reader === 'OPERATOR' ? 'CLIENT' : 'OPERATOR';
        await supabase
            .from('mensagens_suporte')
            .update({ read: true })
            .eq('loan_id', loanId)
            .eq('sender', senderToMark)
            .eq('read', false);
    },

    async getActiveChats(profileId: string) {
        if (!profileId) return [];
        const { data, error } = await supabase
            .from('mensagens_suporte')
            .select('loan_id, created_at, text, sender, read, type, contratos(debtor_name)')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const chatsMap = new Map();
        (data || []).forEach((m: any) => {
            if (!chatsMap.has(m.loan_id)) {
                chatsMap.set(m.loan_id, {
                    loanId: m.loan_id,
                    lastMessage: m.type !== 'text' ? `[${m.type.toUpperCase()}]` : m.text,
                    timestamp: m.created_at,
                    clientName: m.contratos?.debtor_name || 'Solicitação Suporte',
                    unreadCount: m.sender === 'CLIENT' && !m.read ? 1 : 0
                });
            } else if (m.sender === 'CLIENT' && !m.read) {
                chatsMap.get(m.loan_id).unreadCount++;
            }
        });

        return Array.from(chatsMap.values());
    },

    async finishChat(profileId: string, loanId: string, operatorId: string) {
        await this.sendMessage({
            profileId,
            loanId,
            sender: 'OPERATOR',
            operator_id: operatorId,
            text: 'Atendimento finalizado. Obrigado!',
            type: 'system'
        });
    }
};
