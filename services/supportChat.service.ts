import { supabase } from '../lib/supabase';

export type SupportMessageType = 'text' | 'image' | 'audio' | 'file' | 'location';

export interface SupportMessage {
  id: string;
  profile_id: string;
  loan_id: string;

  sender: 'CLIENT' | 'OPERATOR'; // legado
  sender_type: 'CLIENT' | 'OPERATOR';
  sender_user_id: string | null;

  text: string | null;     // legado
  content: string | null;  // novo

  type: SupportMessageType;
  file_url: string | null; // AGORA: path do storage (ex: loans/<loanId>/...)
  metadata: any;

  read: boolean;
  created_at: string;

  operator_id?: string | null;
  read_at?: string | null;
  read_by?: string | null;
}

type SendMessageParams = {
  profileId: string;
  loanId: string;
  sender: 'CLIENT' | 'OPERATOR';
  operatorId?: string;
  text?: string;
  type?: SupportMessageType;
  file?: File;
  metadata?: any;
};

const BUCKET = 'support_chat';
const SIGNED_URL_TTL = 60 * 60; // 1h

function extFromMime(mime: string) {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('pdf')) return 'pdf';
  return 'bin';
}

function isHttpUrl(v?: string | null) {
  if (!v) return false;
  return /^https?:\/\//i.test(v);
}

async function getAuthUid(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user?.id || null;
}

async function uploadToStorage(params: { loanId: string; file: File }) {
  const { loanId, file } = params;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  const safeName = (file.name || 'upload').replace(/[^\w.\-]+/g, '_');
  const ext = safeName.includes('.') ? safeName.split('.').pop() : extFromMime(file.type);
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const path = `loans/${loanId}/${yyyy}-${mm}-${dd}/${fileName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });

  if (upErr) throw new Error(`Storage upload falhou: ${upErr.message}`);

  return { path };
}

async function signPath(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error) throw new Error(`SignedUrl falhou: ${error.message}`);
  return data.signedUrl;
}

export const supportChatService = {
  async getMessages(loanId: string) {
    const { data, error } = await supabase
      .from('mensagens_suporte')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    const msgs = (data || []) as SupportMessage[];

    // Gera signed URLs para anexos (quando file_url é PATH e não http)
    const out: SupportMessage[] = [];
    for (const m of msgs) {
      const hasFile = (m.type === 'audio' || m.type === 'image' || m.type === 'file') && m.file_url;
      if (hasFile && m.file_url && !isHttpUrl(m.file_url)) {
        try {
          const signed = await signPath(m.file_url);
          out.push({
            ...m,
            // aqui troco o file_url por signed URL para tocar/abrir direto
            file_url: signed,
            metadata: { ...(m.metadata || {}), storage_path: m.file_url, signed_expires_in: SIGNED_URL_TTL },
          });
        } catch {
          // se falhar, mantém path (e o UI pode mostrar "indisponível")
          out.push(m);
        }
      } else {
        out.push(m);
      }
    }

    return out;
  },

  async sendMessage(params: SendMessageParams) {
    const { profileId, loanId, sender, operatorId, text, type = 'text', file, metadata } = params;

    const uid = await getAuthUid();
    if (!uid) throw new Error('Sem sessão do Supabase Auth. Faça login novamente.');

    let filePath: string | null = null;
    let finalMeta: any = metadata || {};

    if (file) {
      const { path } = await uploadToStorage({ loanId, file });
      filePath = path;

      finalMeta = {
        ...(finalMeta || {}),
        storage_bucket: BUCKET,
        storage_path: path,
        mime: file.type || null,
        size: file.size || null,
        original_name: file.name || null,
      };
    }

    const payload: any = {
      profile_id: profileId,
      loan_id: loanId,

      // legado + novo
      sender,
      sender_type: sender,
      sender_user_id: uid,

      text: text ?? null,
      content: text ?? null,

      type,
      file_url: filePath, // SALVA O PATH (privado)
      metadata: finalMeta,

      operator_id: operatorId || null,
      read: false,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('mensagens_suporte').insert(payload);
    if (error) throw new Error(error.message);

    return true;
  },

  async markAsRead(loanId: string, viewer: 'CLIENT' | 'OPERATOR') {
    const uid = await getAuthUid();

    const { error } = await supabase
      .from('mensagens_suporte')
      .update({
        read: true,
        read_at: new Date().toISOString(),
        read_by: uid,
      })
      .eq('loan_id', loanId)
      .neq('sender_type', viewer)
      .eq('read', false);

    if (error) throw new Error(error.message);
    return true;
  },

  async getActiveChats(operatorId: string) {
    // Busca mensagens recentes para montar a lista de conversas ativas
    // Usa !inner join com contratos para filtrar e pegar nome do devedor
    const { data, error } = await supabase
      .from('mensagens_suporte')
      .select(`
        id, loan_id, content, text, created_at, read, sender_type,
        contratos!inner (
          debtor_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500); // Limite de segurança para performance

    if (error) {
      console.error('Erro ao buscar chats ativos:', error);
      return [];
    }

    const chatsMap = new Map();

    for (const m of (data || [])) {
        const anyMsg = m as any;
        const loanId = anyMsg.loan_id;
        
        if (!chatsMap.has(loanId)) {
            const clientName = anyMsg.contratos?.debtor_name || 'Cliente';
            chatsMap.set(loanId, {
                loanId: loanId,
                clientName: clientName,
                timestamp: anyMsg.created_at,
                lastMessage: anyMsg.content || anyMsg.text || 'Mídia enviada',
                unreadCount: 0
            });
        }

        // Se for mensagem de cliente e não lida, incrementa contador
        if (anyMsg.sender_type === 'CLIENT' && !anyMsg.read) {
            chatsMap.get(loanId).unreadCount += 1;
        }
    }

    return Array.from(chatsMap.values());
  }
};
