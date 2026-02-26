
import { supabase } from '../lib/supabase';
import { isDev } from '../utils/isDev';

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
  supabaseClient?: any;
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
  async getMessages(loanId: string, supabaseClient: any = supabase) {
    try {
      const { data, error } = await supabaseClient
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
            const { data: signedData, error: signedError } = await supabaseClient.storage.from(BUCKET).createSignedUrl(m.file_url, SIGNED_URL_TTL);
            if (signedError) throw new Error(`SignedUrl falhou: ${signedError.message}`);
            const signed = signedData.signedUrl;
            
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
    } catch (err: any) {
      if (err.message === 'TypeError: Failed to fetch' || err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
        console.warn('[supportChatService] Failed to fetch messages (Network Error):', err);
        return [];
      }
      throw err;
    }
  },

  async sendMessage(params: SendMessageParams) {
    const { profileId, loanId, sender, operatorId, text, type = 'text', file, metadata, supabaseClient = supabase } = params;

    let uid = null;
    if (sender === 'OPERATOR') {
      uid = await getAuthUid();
      if (!uid) throw new Error('Sem sessão do Supabase Auth. Faça login novamente.');
    } else {
      uid = profileId;
    }

    let filePath: string | null = null;
    let finalMeta: any = metadata || {};

    if (file) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');

      const safeName = (file.name || 'upload').replace(/[^\w.\-]+/g, '_');
      const ext = safeName.includes('.') ? safeName.split('.').pop() : extFromMime(file.type);
      const fileName = `${crypto.randomUUID()}.${ext}`;

      const path = `loans/${loanId}/${yyyy}-${mm}-${dd}/${fileName}`;

      const { error: upErr } = await supabaseClient.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });

      if (upErr) throw new Error(`Storage upload falhou: ${upErr.message}`);

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
      profile_id: profileId || null,
      loan_id: loanId || null,

      // legado + novo
      sender,
      sender_type: sender,
      sender_user_id: uid || null,

      text: text ?? null,
      content: text ?? null,

      type,
      file_url: filePath, // SALVA O PATH (privado)
      metadata: finalMeta,

      operator_id: operatorId || null,
      read: false,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient.from('mensagens_suporte').insert(payload);
    if (error) throw new Error(error.message);

    return true;
  },

  async markAsRead(loanId: string, viewer: 'CLIENT' | 'OPERATOR', supabaseClient: any = supabase) {
    let uid = null;
    if (viewer === 'OPERATOR') {
      uid = await getAuthUid();
    }

    const { error } = await supabaseClient
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

  async deleteMessage(messageId: string, supabaseClient: any = supabase) {
    const { error } = await supabaseClient.from('mensagens_suporte').delete().eq('id', messageId);
    if (error) throw error;
  },

  async deleteChatHistory(loanId: string, supabaseClient: any = supabase) {
    const { error } = await supabaseClient.from('mensagens_suporte').delete().eq('loan_id', loanId);
    if (error) throw error;
    // Opcional: Apagar ticket também se quiser resetar status
    await supabaseClient.from('support_tickets').delete().eq('loan_id', loanId);
  },

  async deleteMultipleChats(loanIds: string[]) {
    if (loanIds.length === 0) return;
    const { error } = await supabase.from('mensagens_suporte').delete().in('loan_id', loanIds);
    if (error) throw error;
    // Opcional: Apagar tickets
    await supabase.from('support_tickets').delete().in('loan_id', loanIds);
  },

  async getActiveChats(operatorId: string) {
    if (isDev) {
       console.log('[BUILD-MARK] supportChatService.getActiveChats v6 (Optimized)');
    }
    
    try {
        // 1. Busca mensagens recentes (apenas colunas essenciais, limite reduzido)
        const { data: messages, error } = await supabase
          .from('mensagens_suporte')
          .select('id, loan_id, content, text, created_at, read, sender_type')
          .order('created_at', { ascending: false })
          .limit(100); // Reduzido para 100 para evitar timeout

        if (error) throw error;

        if (!messages || messages.length === 0) return [];

        // 2. Extrai IDs únicos de contratos
        const loanIds = Array.from(new Set(messages.map((m: any) => m.loan_id).filter(Boolean)));
        
        if (loanIds.length === 0) return [];

        // 3. Busca nomes dos devedores em lote
        const contractsMap = new Map<string, { name: string; clientId: string }>();
        
        // Divide em chunks se houver muitos IDs (embora com limit 100 msg, loanIds será <= 100)
        const { data: loans, error: loansError } = await supabase
            .from('contratos')
            .select('id, debtor_name, client_id')
            .in('id', loanIds);
        
        if (!loansError && loans) {
            loans.forEach((l: any) => contractsMap.set(l.id, { name: l.debtor_name || 'Cliente', clientId: l.client_id }));
        }

        const chatsMap = new Map();

        for (const m of messages) {
            const anyMsg = m as any;
            const loanId = anyMsg.loan_id;
            
            const contractInfo = contractsMap.get(loanId);
            if (!contractInfo) continue;

            if (!chatsMap.has(loanId)) {
                chatsMap.set(loanId, {
                    loanId: loanId,
                    clientId: contractInfo.clientId,
                    clientName: contractInfo.name,
                    timestamp: anyMsg.created_at,
                    lastMessage: anyMsg.content || anyMsg.text || 'Mídia enviada',
                    unreadCount: 0,
                    type: 'ACTIVE'
                });
            }

            if (anyMsg.sender_type === 'CLIENT' && !anyMsg.read) {
                chatsMap.get(loanId).unreadCount += 1;
            }
        }

        return Array.from(chatsMap.values());
    } catch (err: any) {
        console.warn('[supportChatService] getActiveChats error:', err);
        return [];
    }
  },

  /**
   * Busca todos os contratos ativos para listar como "Contatos"
   */
  async getAvailableContracts(ownerId: string) {
    const { data, error } = await supabase
      .from('contratos')
      .select('id, debtor_name, debtor_document, debtor_phone, client_id')
      .eq('owner_id', ownerId)
      .neq('is_archived', true)
      .order('debtor_name', { ascending: true })
      .limit(300); // Limite de segurança

    if (error) return [];

    return (data || []).map((c: any) => ({
      loanId: c.id,
      clientId: c.client_id,
      clientName: c.debtor_name || 'Sem Nome',
      debtorDocument: c.debtor_document,
      type: 'CLIENT',
      unreadCount: 0,
      lastMessage: 'Iniciar conversa'
    }));
  },

  /**
   * Busca membros da equipe para chat interno
   */
  async getTeamMembers(ownerId: string) {
     const { data, error } = await supabase
       .from('perfis')
       .select('id, nome_operador, nome_completo, email, access_level')
       .or(`id.eq.${ownerId},supervisor_id.eq.${ownerId}`)
       .order('nome_operador', { ascending: true });

     if (error) return [];

     return (data || []).map((u: any) => ({
       profileId: u.id,
       clientName: u.nome_operador || u.nome_completo || 'Membro',
       role: u.access_level === 1 ? 'Admin' : 'Operador',
       type: 'TEAM',
       unreadCount: 0,
       lastMessage: 'Chat de equipe'
     }));
  }
};
