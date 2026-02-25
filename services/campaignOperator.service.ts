import { supabase } from '../lib/supabase';

const sanitizeExt = (name: string) => {
  const ext = (name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || 'bin';
};

export const campaignOperatorService = {
  async getLeads() {
    const { data, error } = await supabase
      .from('campaign_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getMessages(sessionToken: string) {
    try {
      const { data, error } = await supabase
        .from('campaign_messages')
        .select('*')
        .eq('session_token', sessionToken)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (err: any) {
      if (err.message === 'TypeError: Failed to fetch' || err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
        console.warn('[campaignOperatorService] Failed to fetch messages (Network Error):', err);
        return [];
      }
      throw err;
    }
  },

  async sendMessage(sessionToken: string, message: string) {
    const { data, error } = await supabase.rpc('campaign_add_message', {
      p_session_token: sessionToken,
      p_sender: 'OPERATOR',
      p_message: message
    });

    if (error) throw error;
    return data;
  },

  async uploadAttachment(file: File, sessionToken?: string) {
    const fileExt = sanitizeExt(file.name);
    const uid = crypto.randomUUID();
    const folder = sessionToken ? `campaign_attachments/${sessionToken}` : 'campaign_attachments';
    const filePath = `${folder}/${uid}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('public_assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('public_assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
