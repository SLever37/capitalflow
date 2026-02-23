import { supabase } from '../lib/supabase';

type CampaignNotificationCallback = (payload: any) => void;

export const campaignRealtimeService = {
  startCampaignNotifications({
    onNewLead,
    onNewMessage
  }: {
    onNewLead?: CampaignNotificationCallback;
    onNewMessage?: CampaignNotificationCallback;
  }) {
    // 1. Realtime Subscription
    const channel = supabase.channel('campaign-global-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'campaign_leads' },
        (payload) => {
          if (onNewLead) onNewLead(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'campaign_messages', filter: 'sender=eq.LEAD' },
        (payload) => {
          if (onNewMessage) onNewMessage(payload.new);
        }
      )
      .subscribe();

    // 2. Fallback Polling (a cada 5s)
    let lastCheck = new Date().toISOString();
    const interval = setInterval(async () => {
      if (document.hidden) return;

      // Verifica mensagens novas de LEAD
      const { data: msgs } = await supabase
        .from('campaign_messages')
        .select('id, session_token, message, created_at')
        .eq('sender', 'LEAD')
        .gt('created_at', lastCheck);

      if (msgs && msgs.length > 0) {
        msgs.forEach(msg => {
            if (onNewMessage) onNewMessage(msg);
        });
      }

      // Verifica leads novos
      const { data: leads } = await supabase
        .from('campaign_leads')
        .select('id, name, created_at')
        .gt('created_at', lastCheck);

      if (leads && leads.length > 0) {
        leads.forEach(lead => {
            if (onNewLead) onNewLead(lead);
        });
      }

      lastCheck = new Date().toISOString();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }
};
