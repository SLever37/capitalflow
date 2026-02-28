import { SupabaseClient } from '@supabase/supabase-js';
import {
  ChatAdapter,
  ChatMessage,
  ChatRole,
  ChatHeaderInfo,
  ChatFeatures
} from '../chatAdapter';
import { supabase as defaultSupabase } from '../../../lib/supabase';
import { supportChatService } from '../../../services/supportChat.service';

export interface SupportContext {
  loanId: string;
  profileId: string;
  clientName: string;
  operatorId?: string;
}

const isUuid = (v?: string | null) =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v).trim()
  );

export const createSupportAdapter = (
  role: ChatRole,
  supabaseClient: SupabaseClient = defaultSupabase
): ChatAdapter<SupportContext> => ({

  getFeatures(): ChatFeatures {
    return {
      hasTicket: true,
      hasPresence: true,
      canClose: role === 'OPERATOR',
      canDelete: role === 'OPERATOR',
      canUpload: true
    };
  },

  async getHeader(context: SupportContext): Promise<ChatHeaderInfo> {
    const { loanId } = context;
    if (!isUuid(loanId))
      return { title: context.clientName, subtitle: 'Contrato inválido' };

    try {
      const { data: ticket } = await supabaseClient
        .from('support_tickets')
        .select('status')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: presence } = await supabaseClient
        .from('support_presence')
        .select('last_seen_at')
        .eq('loan_id', loanId)
        .neq('role', role)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const isOnline = presence?.last_seen_at
        ? Date.now() - new Date(presence.last_seen_at).getTime() < 60000
        : false;

      return {
        title: context.clientName,
        subtitle: `Contrato: ${loanId.slice(0, 8)}`,
        status: (ticket?.status as any) || 'OPEN',
        isOnline
      };

    } catch (err: any) {
      console.warn('[supportAdapter] header error:', err?.message);
      return {
        title: context.clientName,
        subtitle: `Contrato: ${loanId.slice(0, 8)}`,
        status: 'OPEN',
        isOnline: false
      };
    }
  },

  async listMessages(context: SupportContext): Promise<ChatMessage[]> {
    if (!isUuid(context.loanId)) return [];

    const msgs = await supportChatService.getMessages(context.loanId, supabaseClient);

    return msgs.map((m: any) => ({
      ...m,
      content: m.content || m.text
    })) as any;
  },

  subscribeMessages(context: SupportContext, handlers) {
    const { loanId, profileId } = context;
    if (!isUuid(loanId)) return () => {};

    const channel = supabaseClient
      .channel(`support-${loanId}`)

      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_suporte',
          filter: `loan_id=eq.${loanId}`
        },
        (payload) => {
          const newMsg = payload.new as any;

          // ✅ evita notificar a si mesmo
          if (newMsg.profile_id === profileId) return;

          handlers.onNewMessage?.({
            ...newMsg,
            content: newMsg.content || newMsg.text
          } as any);
        }
      )

      .subscribe();

    // 🔵 heartbeat presença
    const interval = setInterval(async () => {
      try {
        if (!isUuid(profileId) || !isUuid(loanId)) return;

        const presenceProfileId =
          role === 'OPERATOR'
            ? (context.operatorId && isUuid(context.operatorId)
                ? context.operatorId
                : profileId)
            : profileId;

        const { error } = await supabaseClient
          .from('support_presence')
          .upsert({
            profile_id: presenceProfileId,
            loan_id: loanId,
            role,
            last_seen_at: new Date().toISOString(),
          });

        if (error) {
          console.warn('[presence] upsert error:', error.message);
        }

      } catch (e: any) {
        console.warn('[presence] heartbeat crash:', e?.message);
      }
    }, 20000);

    return () => {
      supabaseClient.removeChannel(channel);
      clearInterval(interval);
    };
  },

  async sendMessage(context: SupportContext, payload): Promise<void> {
    const { loanId, profileId } = context;

    if (!isUuid(loanId) || !isUuid(profileId))
      throw new Error('Dados inválidos');

    const operatorId =
      role === 'OPERATOR'
        ? (context.operatorId && isUuid(context.operatorId)
            ? context.operatorId
            : profileId)
        : undefined;

    const text = String(payload?.content || '').trim();
    if (!text && !payload?.file)
      throw new Error('Mensagem vazia');

    await supportChatService.sendMessage({
      profileId,
      loanId,
      sender: role as any,
      operatorId,
      text,
      type: payload.type as any,
      file: payload.file,
      metadata: payload.metadata,
      supabaseClient
    });
  },

  async deleteMessage(_context, messageId): Promise<void> {
    await supportChatService.deleteMessage(messageId, supabaseClient);
  },

  async markAsRead(context: SupportContext): Promise<void> {
    await supportChatService.markAsRead(context.loanId, role as any, supabaseClient);
  },

  async closeTicket(context): Promise<void> {
    const { loanId, profileId } = context;

    await supabaseClient
      .from('support_tickets')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        closed_by: profileId,
        updated_at: new Date().toISOString(),
      })
      .eq('loan_id', loanId)
      .eq('status', 'OPEN');
  },

  async reopenTicket(context): Promise<void> {
    const { loanId, profileId } = context;

    await supabaseClient
      .from('support_tickets')
      .insert({
        loan_id: loanId,
        status: 'OPEN',
        profile_id: profileId,
      });
  }

});