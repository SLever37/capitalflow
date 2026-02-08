
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { playNotificationSound } from '../../../utils/notificationSound';

type Role = 'CLIENT' | 'OPERATOR';

export const useSupportRealtime = (loanId: string, profileId: string, role: Role) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [ticketStatus, setTicketStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
    const [isOnline, setIsOnline] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const channelRef = useRef<any>(null);
    const heartbeatRef = useRef<any>(null);

    // 1. Carga Inicial
    useEffect(() => {
        if (!loanId) return;

        const loadInitial = async () => {
            setIsLoading(true);
            
            // Mensagens
            const { data: msgs } = await supabase
                .from('mensagens_suporte')
                .select('*')
                .eq('loan_id', loanId)
                .order('created_at', { ascending: true });
            
            if (msgs) setMessages(msgs);

            // Status do Ticket
            const { data: ticket } = await supabase
                .from('support_tickets')
                .select('status')
                .eq('loan_id', loanId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (ticket) setTicketStatus(ticket.status);
            else {
                // Cria se não existir
                const { data: newTicket } = await supabase
                    .from('support_tickets')
                    .insert({ loan_id: loanId, status: 'OPEN' })
                    .select()
                    .single();
                if (newTicket) setTicketStatus('OPEN');
            }

            setIsLoading(false);
        };

        loadInitial();
    }, [loanId]);

    // 2. Realtime Subscription e Presença
    useEffect(() => {
        if (!loanId || !profileId) return;

        const channel = supabase.channel(`support-${loanId}`)
            // Listener Mensagens
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_suporte', filter: `loan_id=eq.${loanId}` }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
                if (payload.new.profile_id !== profileId) playNotificationSound();
            })
            // Listener Status Ticket
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets', filter: `loan_id=eq.${loanId}` }, (payload) => {
                setTicketStatus(payload.new.status);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `loan_id=eq.${loanId}` }, (payload) => {
                setTicketStatus(payload.new.status);
            })
            // Listener Presença (Tabela support_presence)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_presence', filter: `loan_id=eq.${loanId}` }, (payload) => {
                // Verifica se a outra parte está online (role oposta)
                if (payload.new && payload.new.role !== role) {
                    const lastSeen = new Date(payload.new.last_seen_at).getTime();
                    const now = Date.now();
                    setIsOnline((now - lastSeen) < 60000); // 60s tolerancia
                }
            })
            .subscribe();

        channelRef.current = channel;

        // 3. Heartbeat (Envia "Estou Aqui")
        const sendHeartbeat = async () => {
            await supabase.from('support_presence').upsert({
                profile_id: profileId,
                loan_id: loanId,
                role: role,
                last_seen_at: new Date().toISOString()
            });
        };

        sendHeartbeat();
        heartbeatRef.current = setInterval(sendHeartbeat, 20000); // 20s

        return () => {
            supabase.removeChannel(channel);
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        };
    }, [loanId, profileId, role]);

    const sendMessage = async (content: string, type: string = 'text', fileUrl?: string) => {
        if (ticketStatus === 'CLOSED' && role === 'CLIENT') throw new Error("Atendimento encerrado.");
        
        await supabase.from('mensagens_suporte').insert({
            profile_id: profileId,
            loan_id: loanId,
            sender_type: role,
            content: content,
            type: type,
            file_url: fileUrl,
            read: false,
            created_at: new Date().toISOString()
        });
    };

    const updateTicketStatus = async (newStatus: 'OPEN' | 'CLOSED') => {
        // Encerra o atual ou cria um novo
        if (newStatus === 'CLOSED') {
            await supabase.from('support_tickets')
                .update({ status: 'CLOSED', closed_at: new Date().toISOString(), closed_by: profileId })
                .eq('loan_id', loanId)
                .eq('status', 'OPEN');
        } else {
            // Reabrir = Criar Novo Ticket
            await supabase.from('support_tickets').insert({
                loan_id: loanId,
                status: 'OPEN',
                profile_id: profileId // quem reabriu
            });
        }
    };

    return {
        messages,
        ticketStatus,
        isOnline,
        isLoading,
        sendMessage,
        updateTicketStatus
    };
};
