import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { playNotificationSound } from '../../../utils/notificationSound';

type Role = 'CLIENT' | 'OPERATOR';
type TicketStatus = 'OPEN' | 'CLOSED';

const ONLINE_TTL_MS = 60_000; // 60s
const HEARTBEAT_MS = 20_000;  // 20s
const ONLINE_POLL_MS = 10_000;

function isOtherOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  const last = new Date(lastSeenAt).getTime();
  return Number.isFinite(last) && (Date.now() - last) < ONLINE_TTL_MS;
}

export const useSupportRealtime = (loanId: string, profileId: string, role: Role) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('OPEN');
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const channelRef = useRef<any>(null);
  const heartbeatRef = useRef<number | null>(null);
  const onlinePollRef = useRef<number | null>(null);

  // 1) Carga inicial: mensagens + ticket + presença
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

      // Ticket (último)
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('id,status,created_at')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ticket?.status) {
        setTicketStatus(ticket.status as TicketStatus);
      } else {
        // Cria ticket inicial OPEN (com profile_id de quem abriu)
        const { data: newTicket } = await supabase
          .from('support_tickets')
          .insert({ loan_id: loanId, status: 'OPEN', profile_id: profileId })
          .select('status')
          .single();

        if (newTicket?.status) setTicketStatus(newTicket.status as TicketStatus);
      }

      // Presença inicial: pega o último last_seen da role oposta
      const { data: presence } = await supabase
        .from('support_presence')
        .select('last_seen_at,role')
        .eq('loan_id', loanId)
        .neq('role', role)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setIsOnline(isOtherOnline((presence as any)?.last_seen_at));
      setIsLoading(false);
    };

    loadInitial();
  }, [loanId, profileId, role]);

  // 2) Realtime + heartbeat + polling de online
  useEffect(() => {
    if (!loanId || !profileId) return;

    const channel = supabase
      .channel(`support-${loanId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_suporte', filter: `loan_id=eq.${loanId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);

          // Som somente se a mensagem não foi enviada por mim
          const senderUserId =
            (payload.new as any)?.sender_user_id ||
            (payload.new as any)?.operator_id ||
            null;

          const isMine = senderUserId
            ? senderUserId === profileId
            : (payload.new as any)?.profile_id === profileId;

          if (!isMine) playNotificationSound();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets', filter: `loan_id=eq.${loanId}` },
        (payload) => {
          if ((payload.new as any)?.status) {
            setTicketStatus((payload.new as any).status as TicketStatus);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_presence', filter: `loan_id=eq.${loanId}` },
        (payload) => {
          if (payload.new && (payload.new as any).role !== role) {
            setIsOnline(isOtherOnline((payload.new as any).last_seen_at));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Heartbeat
    const sendHeartbeat = async () => {
      await supabase.from('support_presence').upsert({
        profile_id: profileId,
        loan_id: loanId,
        role,
        last_seen_at: new Date().toISOString(),
      });
    };

    sendHeartbeat();
    heartbeatRef.current = window.setInterval(sendHeartbeat, HEARTBEAT_MS);

    // Poll online (resolve casos de background / perda de evento)
    const pollOnline = async () => {
      const { data } = await supabase
        .from('support_presence')
        .select('last_seen_at,role')
        .eq('loan_id', loanId)
        .neq('role', role)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setIsOnline(isOtherOnline((data as any)?.last_seen_at));
    };

    onlinePollRef.current = window.setInterval(pollOnline, ONLINE_POLL_MS);

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;

      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;

      if (onlinePollRef.current) window.clearInterval(onlinePollRef.current);
      onlinePollRef.current = null;
    };
  }, [loanId, profileId, role]);

  // Envio simples (texto/link). Uploads: use supportChat.service.ts
  const sendMessage = async (
    content: string,
    type: string = 'text',
    fileUrl?: string,
    metadata?: any
  ) => {
    if (ticketStatus === 'CLOSED' && role === 'CLIENT') {
      throw new Error('Atendimento encerrado. Aguarde reabertura pelo operador ou abra um novo chamado.');
    }

    await supabase.from('mensagens_suporte').insert({
      profile_id: profileId,
      loan_id: loanId,
      sender: role,       // legado
      sender_type: role,  // novo
      sender_user_id: profileId,
      content,
      type,
      file_url: fileUrl || null,
      metadata: metadata || null,
      read: false,
      created_at: new Date().toISOString(),
    });
  };

  // ✅ NOVO: Enviar localização real
  const sendLocation = async (lat: number, lng: number) => {
    await sendMessage(
      `https://maps.google.com/?q=${lat},${lng}`,
      'location',
      null as any,
      { lat, lng }
    );
  };

  const updateTicketStatus = async (newStatus: TicketStatus) => {
    if (newStatus === 'CLOSED') {
      await supabase
        .from('support_tickets')
        .update({
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
          closed_by: profileId,
          updated_at: new Date().toISOString(),
        })
        .eq('loan_id', loanId)
        .eq('status', 'OPEN');
      return;
    }

    // Reabrir = cria novo ticket OPEN (histórico preservado)
    await supabase.from('support_tickets').insert({
      loan_id: loanId,
      status: 'OPEN',
      profile_id: profileId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  return {
    messages,
    ticketStatus,
    isOnline,
    isLoading,
    sendMessage,
    sendLocation, // ✅ exportado
    updateTicketStatus,
  };
};