import { supabase } from '../lib/supabase';

/**
 * Gera (ou reutiliza) link único do portal para um contrato
 */
export async function getOrCreatePortalLink(loanId: string): Promise<string> {
  // 1) tenta pegar token existente
  const { data: existing, error: fetchError } = await supabase
    .from('contratos')
    .select('portal_token')
    .eq('id', loanId)
    .single();

  if (fetchError) {
    throw new Error('Erro ao buscar contrato');
  }

  let token = existing?.portal_token as string | null;

  // 2) se não existir, cria
  if (!token) {
    const { data: updated, error: updateError } = await supabase
      .from('contratos')
      .update({ portal_token: crypto.randomUUID() })
      .eq('id', loanId)
      .select('portal_token')
      .single();

    if (updateError || !updated?.portal_token) {
      throw new Error('Erro ao gerar link do portal');
    }

    token = updated.portal_token;
  }

  // 3) monta URL final
  return `${window.location.origin}/?portal=${token}`;
}