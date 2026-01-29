
import { supabase } from '../lib/supabase';

export const clientAvatarService = {
  /**
   * Realiza upload da imagem para o bucket 'avatars'
   */
  async uploadAvatar(file: File, clientId: string): Promise<string> {
    if (!file) throw new Error("Arquivo inválido.");
    
    // Extensão e Caminho (clientes/ID/timestamp.ext) para evitar cache agressivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}/${Date.now()}.${fileExt}`;
    const filePath = `clientes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Atualiza a URL do cliente e propaga para os contratos (snapshot visual)
   */
  async updateClientPhoto(clientId: string, photoUrl: string) {
    // 1. Atualizar Tabela Clientes
    const { error: clientError } = await supabase
      .from('clientes')
      .update({ foto_url: photoUrl })
      .eq('id', clientId);

    if (clientError) throw new Error(`Erro ao salvar no cliente: ${clientError.message}`);

    // 2. Propagar para Contratos (Snapshot) para manter visualização rápida
    // Isso garante que ao abrir o dashboard, a foto apareça sem join extra
    const { error: loanError } = await supabase
      .from('contratos')
      .update({ cliente_foto_url: photoUrl })
      .eq('client_id', clientId);

    if (loanError) console.warn("Aviso: Falha ao propagar foto para contratos.", loanError);
    
    return true;
  }
};
