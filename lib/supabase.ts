
import { createClient } from '@supabase/supabase-js';
import { isDev } from '../utils/isDev';

/**
 * Helper para acesso seguro ao ambiente.
 * Previne "TypeError: Cannot read properties of undefined" ao acessar import.meta.env
 */
const safeEnv = (() => {
  try {
    return ((import.meta as any)?.env ?? {}) as Record<string, any>;
  } catch {
    return {};
  }
})();

// Configurações baseadas no ambiente ou fallback estático
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  safeEnv.VITE_SUPABASE_URL ||
  'https://hzchchbxkhryextaymkn.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  safeEnv.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y2hjaGJ4a2hyeWV4dGF5bWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk2ODcsImV4cCI6MjA4MzMzNTY4N30.kX6FlTuPkl7XfycwVuZN2mI6e3ed8NaDUoyAHy9L3nc';

if (!SUPABASE_URL) {
  console.warn('[SUPABASE] URL não detectada nas variáveis de ambiente.');
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === '') {
  console.warn('[SUPABASE] Anon Key ausente. Operações de banco podem falhar.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'cm_supabase_auth',
  },
});

// Debug em desenvolvimento
if (isDev) {
  console.log('[SUPABASE] Inicializado:', SUPABASE_URL);
  console.log('[SUPABASE] Key Prefix:', (SUPABASE_ANON_KEY || '').slice(0, 12));
}
