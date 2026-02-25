// feature/support/hooks/useSupportRealtime.ts
import { useEffect, useRef, useState } from 'react';
import { supabase as defaultSupabase } from '../../../lib/supabase';
import { isDev } from '../../../utils/isDev';
import { playNotificationSound } from '../../../utils/notificationSound';
import { supportChatService } from '../../../services/supportChat.service';

type Role = 'CLIENT' | 'OPERATOR';
type TicketStatus = 'OPEN' | 'CLOSED';

const ONLINE_TTL_MS = 60_000; // 60s
const HEARTBEAT_MS = 20_000; // 20s
const ONLINE_POLL_MS = 10_000;

function isOtherOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  const last = new Date(lastSeenAt).getTime();
  return Number.isFinite(last) && Date.now() - last < ONLINE_TTL_MS;
}

/**
 * UUID v1-v5
 * Evita uuid:"" / null chegando no Postgres.
 */
const isUuid = (v?: string | null) =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v).trim()
  );

export const useSupportRealtime = (
  loanId: string,
  profileId: string,
  role: Role,
  customSupabase?: any
) => {
  const supabase = customSupabase || defaultSupabase;

  const [messages, setMessages] = useState<any[]>([]);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('OPEN');
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const channelRef = useRef<any>(null);
  const heartbeatRef = useRef<number | null>(null);
  const onlinePollRef = useRef<number | null>(null);

  // ✅ ids válidos p/ queries/insert (evita uuid:"" e RLS confusa)
  const idsOk = isUuid(loanId) && isUuid(profileId);

  // 1) Carga inicial: mensagens + ticket + presença
  useEffect(() => {
    if (!idsOk) {
      setMessages([]);
      setTicketStatus('OPEN');
      setIsOnline(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadInitial = async () => {
      setIsLoading(true);

      // Mensagens
      {
        const { data: msgs, error } = await supabase
          .from('mensagens_suporte')
          .select('*')
          .eq('loan_id', loanId)
          .order('created_at', { ascending: true });

        if (!cancelled && !error && msgs) setMessages(msgs);
      }

      // Ticket (último)
      {
        const { data: ticket, error: tErr } = await supabase
          .from('support_tickets')
          .select('id,status,created_at')
          .eq('loan_id', loanId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && !tErr) {
          if (ticket?.status) {
            setTicketStatus(ticket.status as TicketStatus);
          } else {
            // Cria ticket inicial OPEN (sem created_at manual)
            const { data: newTicket, error: insErr } = await supabase
              .from('support_tickets')
              .insert({
                loan_id: loanId,
                status: 'OPEN',
                profile_id: profileId,
              })
              .select('status')
              .single();

            if (!cancelled && !insErr && newTicket?.status) {
              setTicketStatus(newTicket.status as TicketStatus);
            }
          }
        }
      }

      // Presença inicial: pega o último last_seen da role oposta
      {
        const { data: presence, error: pErr } = await supabase
          .from('support_presence')
          .select('last_seen_at,role')
          .eq('loan_id', loanId)
          .neq('role', role)
          .order('last_seen_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && !pErr) {
          setIsOnline(isOtherOnline((presence as any)?.last_seen_at));
        }
      }

      if (!cancelled) setIsLoading(false);
    };

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [idsOk, loanId, profileId, role, supabase]);

  // 2) Realtime + heartbeat + polling de online
  useEffect(() => {
    if (!idsOk) return;

    const channel = supabase
      .channel(`support-${loanId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_suporte',
          filter: `loan_id=eq.${loanId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);

          // 🔥 CORREÇÃO: notificar somente se NÃO foi enviado por mim
          const n: any = payload.new;

          // prioridade: campos que no seu INSERT carregam o profileId real
          const senderProfileId =
            n?.operator_id ??
            n?.profile_id ??
            n?.sender_user_id ??
            null;

          const isMine = senderProfileId && String(senderProfileId) === String(profileId);

          if (!isMine) playNotificationSound();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'mensagens_suporte',
          filter: `loan_id=eq.${loanId}`,
        },
        (payload) => {
          if (payload.old && (payload.old as any).id) {
            const oldId = (payload.old as any).id;
            setMessages((prev) => prev.filter((m) => m.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `loan_id=eq.${loanId}`,
        },
        (payload) => {
          if ((payload.new as any)?.status) {
            setTicketStatus((payload.new as any).status as TicketStatus);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_presence',
          filter: `loan_id=eq.${loanId}`,
        },
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
      if (!idsOk) return;

      // ✅ Para CLIENT: manter um profile_id válido.
      const { error } = await supabase.from('support_presence').upsert({
        profile_id: profileId,
        loan_id: loanId,
        role,
        last_seen_at: new Date().toISOString(),
      });

      if (error) console.error('support_presence upsert error:', error);
    };

    sendHeartbeat();
    heartbeatRef.current = window.setInterval(sendHeartbeat, HEARTBEAT_MS);

    // Poll online
    const pollOnline = async () => {
      if (!idsOk) return;

      const { data, error } = await supabase
        .from('support_presence')
        .select('last_seen_at,role')
        .eq('loan_id', loanId)
        .neq('role', role)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) setIsOnline(isOtherOnline((data as any)?.last_seen_at));
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
  }, [idsOk, loanId, profileId, role, supabase]);

  // Envio simples (texto/link). Uploads: use supportChat.service.ts
  const sendMessage = async (content: string, type: string = 'text', fileUrl?: string, metadata?: any) => {
    // ✅ Bloqueio duro: não deixa cair em uuid null/""
    if (!idsOk) {
      throw new Error('Não foi possível identificar o contrato para o atendimento. Volte e abra o chat pelo contrato.');
    }
    if (ticketStatus === 'CLOSED' && role === 'CLIENT') {
      throw new Error('Atendimento encerrado. Aguarde reabertura pelo operador ou abra um novo chamado.');
    }

    const payload: any = {
      loan_id: loanId,
      profile_id: profileId,

      // Dados de remetente
      sender: role,
      sender_type: role,

      // ✅ Para CLIENT, NÃO mande sender_user_id null.
      sender_user_id: profileId,

      // Conteúdo
      content: content ?? '',
      text: content ?? '',
      type,
      file_url: fileUrl || null,
      metadata: metadata || null,

      // Status inicial
      read: false,
      // created_at: deixar o default do banco
    };

    if (role === 'OPERATOR') payload.operator_id = profileId;

    if (isDev) console.log('[PORTAL_SUPPORT_SEND_PAYLOAD]', payload);

    const { error } = await supabase.from('mensagens_suporte').insert(payload);

    if (error) {
      if (isDev) console.error('[CHAT_SEND_ERROR]', error, payload);
      throw new Error(error.message || 'Falha ao enviar mensagem.');
    }
  };

  // ✅ Enviar localização real
  const sendLocation = async (lat: number, lng: number) => {
    await sendMessage(`https://maps.google.com/?q=${lat},${lng}`, 'location', undefined, { lat, lng });
  };

  const updateTicketStatus = async (newStatus: TicketStatus) => {
    if (!idsOk) {
      throw new Error('Não foi possível identificar o contrato para o atendimento. Volte e abra o chat pelo contrato.');
    }

    if (newStatus === 'CLOSED') {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
          closed_by: profileId,
          updated_at: new Date().toISOString(),
        })
        .eq('loan_id', loanId)
        .eq('status', 'OPEN');

      if (error) throw new Error(error.message || 'Falha ao encerrar ticket.');
      return;
    }

    // Reabrir = cria novo ticket OPEN (histórico preservado)
    const { error } = await supabase.from('support_tickets').insert({
      loan_id: loanId,
      status: 'OPEN',
      profile_id: profileId,
      // created_at/updated_at: defaults do banco, se existirem
    });

    if (error) throw new Error(error.message || 'Falha ao reabrir ticket.');
  };

  // Nova função para deletar mensagem
  const deleteMessage = async (msgId: string) => {
    await supportChatService.deleteMessage(msgId);
  };

  return {
    messages,
    ticketStatus,
    isOnline,
    isLoading,
    sendMessage,
    sendLocation,
    updateTicketStatus,
    deleteMessage,
  };
};