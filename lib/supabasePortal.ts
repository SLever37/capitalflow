import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase “portal/público”.
 *
 * Mantém o MESMO projeto do Supabase principal.
 * Se você quiser separar projetos no futuro, crie variáveis próprias.
 */

type EnvLike = Record<string, any>;

function readEnv(): EnvLike {
  try {
    const meta = import.meta as any;
    if (meta?.env) return meta.env as EnvLike;
  } catch {
    // ignore
  }
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

export const supabasePortal = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
