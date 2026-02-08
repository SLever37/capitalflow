import { supabase } from '../lib/supabase';

type SendTextParams = {
  loanId: string;
  profileId: string;
  sender: 'CLIENT' | 'OPERATOR';
  text: string;
};

type SendAudioParams = {
  loanId: string;
  profileId: string;
  sender: 'CLIENT' | 'OPERATOR';
  audioBlob: Blob;
  duration: number;
};

export const supportChatService = {
  /* ===========================
     TEXTO
  =========================== */
  async sendTextMessage(params: SendTextParams) {
    const { loanId, profileId, sender, text } = params;

    if (!text.trim()) return;

    const { error } = await supabase.from('mensagens_suporte').insert({
      loan_id: loanId,
      profile_id: profileId,
      sender,
      type: 'TEXT',
      content: text,
      file_url: null,
      metadata: null,
      read: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Chat] erro ao enviar texto', error);
      throw error;
    }
  },

  /* ===========================
     ÁUDIO (CORRIGIDO)
  =========================== */
  async sendAudioMessage(params: SendAudioParams) {
    const { loanId, profileId, sender, audioBlob, duration } = params;

    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Áudio vazio');
    }

    // 1️⃣ gerar arquivo
    const fileName = `audio_${Date.now()}.webm`;
    const filePath = `${loanId}/${fileName}`;

    const audioFile = new File([audioBlob], fileName, {
      type: audioBlob.type || 'audio/webm',
    });

    // 2️⃣ upload no storage
    const { data: uploadData, error: uploadError } =
      await supabase.storage
        .from('chat-audio')
        .upload(filePath, audioFile, {
          upsert: false,
        });

    if (uploadError) {
      console.error('[Chat] erro upload áudio', uploadError);
      throw uploadError;
    }

    // 3️⃣ gerar URL pública
    const { data: urlData } = supabase.storage
      .from('chat-audio')
      .getPublicUrl(uploadData.path);

    const audioUrl = urlData?.publicUrl;

    if (!audioUrl) {
      throw new Error('Falha ao gerar URL do áudio');
    }

    // 4️⃣ inserir mensagem no chat (AQUI estava o bug)
    const { error: msgError } = await supabase
      .from('mensagens_suporte')
      .insert({
        loan_id: loanId,
        profile_id: profileId,
        sender,
        type: 'AUDIO',
        content: null,
        file_url: audioUrl,
        metadata: {
          duration,
        },
        read: false,
        created_at: new Date().toISOString(),
      });

    if (msgError) {
      console.error('[Chat] erro ao salvar mensagem de áudio', msgError);
      throw msgError;
    }
  },

  /* ===========================
     LOCALIZAÇÃO (REAL – não demo)
     (deixa pronto, ativa depois)
  =========================== */
  async sendLocationMessage(params: {
    loanId: string;
    profileId: string;
    sender: 'CLIENT' | 'OPERATOR';
    lat: number;
    lng: number;
  }) {
    const { loanId, profileId, sender, lat, lng } = params;

    const { error } = await supabase.from('mensagens_suporte').insert({
      loan_id: loanId,
      profile_id: profileId,
      sender,
      type: 'LOCATION',
      content: null,
      file_url: null,
      metadata: {
        lat,
        lng,
      },
      read: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Chat] erro ao enviar localização', error);
      throw error;
    }
  },
};
