import { createClient } from '@supabase/supabase-js';

/**
 * Utilitário para ler variáveis de ambiente de forma segura no Vite/Cloudflare.
 * Prioriza import.meta.env (padrão Vite) e fallback para process.env (injetado via define).
 */
function getEnvVar(key: string): string {
  // 1. Tenta via import.meta.env (Vite bakes this in at build time)
  try {
    const val = (import.meta as any).env?.[key];
    if (val) return String(val).trim();
  } catch {}

  // 2. Tenta via process.env (Vite define replaces this)
  try {
    // @ts-ignore
    const val = typeof process !== 'undefined' ? process.env?.[key] : undefined;
    if (val) return String(val).trim();
  } catch {}

  return '';
}

function requireEnv(key: string): string {
  const val = getEnvVar(key);
  if (!val) {
    console.warn(`[ENV] Variável obrigatória ausente: ${key}`);
    return '';
  }
  return val;
}

const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY');

// Se as variáveis estiverem vazias, o createClient vai falhar. 
// Vamos garantir que o erro seja capturado pelo AppErrorBoundary.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const missing = !SUPABASE_URL ? 'VITE_SUPABASE_URL' : 'VITE_SUPABASE_ANON_KEY';
  throw new Error(
    `Configuração do Supabase ausente (${missing}). ` +
    `Certifique-se de configurar as variáveis de ambiente no Cloudflare Pages.`
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'cm_supabase_auth',
  },
});
