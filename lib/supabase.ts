import { createClient } from '@supabase/supabase-js';

/**
 * CapitalFlow — conexão ÚNICA com o Supabase
 *
 * ⚠️ Removido fallback hardcoded.
 * Motivo: fallback “silencioso” é a causa clássica de você operar no projeto errado
 * (e aí acontece exatamente o que você descreveu: contrato pago no app, mas “aberto”
 * no banco que você está debugando, ou vice-versa).
 *
 * Variáveis obrigatórias (Vite/Cloudflare Pages):
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */

type EnvLike = Record<string, any>;

function readEnv(): EnvLike {
  try {
    const meta = import.meta as any;
    if (meta?.env) return meta.env as EnvLike;
  } catch {
    // ignore
  }

  // Fallback apenas para ambientes que injetam process.env (não é o padrão do Vite no browser)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && (process as any)?.env) return (process as any).env as EnvLike;
  } catch {
    // ignore
  }

  return {};
}

function requireEnv(key: string): string {
  const env = readEnv();
  const val = String(env?.[key] ?? '').trim();
  if (!val) {
    throw new Error(
      `[ENV] Variável obrigatória ausente: ${key}. ` +
        `Configure em Cloudflare Pages (Environment Variables) e no .env.local (dev).`
    );
  }
  return val;
}

const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'cm_supabase_auth',
  },
});
