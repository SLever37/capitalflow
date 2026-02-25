
import { ChatAdapter, ChatMessage, ChatRole, ChatHeaderInfo, ChatFeatures, MessageType } from '../chatAdapter';
import { supabase } from '../../../lib/supabase';

export interface CaptacaoContext {
  sessionToken: string;
  clientName: string;
}

const isUuid = (v?: string | null) =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v).trim()
  );

export const createCaptacaoAdapter = (role: ChatRole): ChatAdapter<CaptacaoContext> => ({
  getFeatures(): ChatFeatures {
    return {
      hasTicket: false,
      hasPresence: false,
      canClose: false,
      canDelete: false,
      canUpload: true
    };
  },

  async getHeader(context: CaptacaoContext): Promise<ChatHeaderInfo> {
    return {
      title: context.clientName || 'Lead de Captação',
      subtitle: 'Atendimento Direto'
    };
  },

  async listMessages(context: CaptacaoContext): Promise<ChatMessage[]> {
    if (!isUuid(context.sessionToken)) return [];
    
    const { data, error } = await supabase
      .from('campaign_messages')
      .select('*')
      .eq('session_token', context.sessionToken)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(m => {
        const isAnexo = m.message?.startsWith('[ANEXO]');
        const fileUrl = isAnexo ? m.message.split(' ')[1] : undefined;
        const isImage = fileUrl?.match(/\.(jpeg|jpg|gif|png)$/i);

        return {
            id: m.id,
            content: isAnexo ? (isImage ? '📷 Imagem' : '📎 Arquivo') : m.message,
            text: m.message,
            type: isAnexo ? (isImage ? 'image' : 'file') : 'text',
            sender_type: m.sender === 'LEAD' ? 'CLIENT' : 'OPERATOR',
            sender_user_id: m.sender === 'LEAD' ? 'LEAD' : 'OPERATOR',
            created_at: m.created_at,
            file_url: fileUrl
        };
    }) as any;
  },

  subscribeMessages(context: CaptacaoContext, handlers) {
    const { sessionToken } = context;
    if (!isUuid(sessionToken)) return () => {};

    const channel = supabase
      .channel(`captacao-unified-${sessionToken}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'campaign_messages', filter: `session_token=eq.${sessionToken}` },
        (payload) => {
          const m = payload.new as any;
          const isAnexo = m.message?.startsWith('[ANEXO]');
          const fileUrl = isAnexo ? m.message.split(' ')[1] : undefined;
          const isImage = fileUrl?.match(/\.(jpeg|jpg|gif|png)$/i);

          handlers.onNewMessage({
            id: m.id,
            content: isAnexo ? (isImage ? '📷 Imagem' : '📎 Arquivo') : m.message,
            text: m.message,
            type: isAnexo ? (isImage ? 'image' : 'file') : 'text',
            sender_type: m.sender === 'LEAD' ? 'CLIENT' : 'OPERATOR',
            sender_user_id: m.sender === 'LEAD' ? 'LEAD' : 'OPERATOR',
            created_at: m.created_at,
            file_url: fileUrl
          } as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async sendMessage(context: CaptacaoContext, payload): Promise<void> {
    const { sessionToken } = context;
    if (!isUuid(sessionToken)) throw new Error('Sessão inválida');

    let finalMessage = payload.content;

    if (payload.file) {
        // Simula upload se não houver infra (ou usa a existente se soubermos)
        // No CapitalFlow, o upload geralmente é feito via storage.
        // Vou assumir que o payload.file deve ser enviado via service se existir.
        // Mas o pedido diz "se já existir infra".
        // O hook useCampaignChat usa sendAttachment.
        // Como não quero duplicar lógica de upload complexa aqui, vou tentar usar o que o useCampaignChat faz.
        // Mas o adapter deve ser independente.
        
        // Se houver arquivo, precisamos fazer o upload para o bucket 'campaign-attachments'
        const fileExt = payload.file.name.split('.').pop();
        const fileName = `${sessionToken}/${Math.random().toString(36).slice(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('campaign-attachments')
            .upload(fileName, payload.file);
            
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
            .from('campaign-attachments')
            .getPublicUrl(uploadData.path);
            
        finalMessage = `[ANEXO] ${publicUrl}`;
    }

    const { error } = await supabase.from('campaign_messages').insert({
      session_token: sessionToken,
      sender: role === 'OPERATOR' ? 'OPERATOR' : 'LEAD',
      message: finalMessage
    });

    if (error) throw error;
  }
});
