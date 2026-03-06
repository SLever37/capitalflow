import { createClient } from '@supabase/supabase-js';

function getEnvVar(key: string): string {
  try {
    const val = import.meta.env?.[key as keyof ImportMetaEnv];
    if (val) return String(val).trim();
  } catch {}

  return '';
}

function requireEnv(key: string): string {
  const val = getEnvVar(key);
  if (!val) {
    console.error(`[ENV] Variável obrigatória ausente: ${key}`);
    throw new Error(
      `Configuração do Supabase ausente (${key}). ` +
      `Configure essa variável no Cloudflare Pages antes do build.`
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
