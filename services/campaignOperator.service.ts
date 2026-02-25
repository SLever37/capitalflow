import { supabase } from '../lib/supabase';

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

  async uploadAttachment(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `campaign_attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public_assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('public_assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
