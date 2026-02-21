import { createClient } from '@supabase/supabase-js';

/**
 * Helper para acesso seguro ao ambiente.
 */
const safeEnv = (() => {
  try {
    const meta = (import.meta as any);
    if (meta && meta.env) return meta.env;
    if (typeof process !== 'undefined' && process.env) return process.env;
    return {};
  } catch {
    return {};
  }
})();

const SUPABASE_URL =
  safeEnv.VITE_SUPABASE_URL ||
  'https://hzchchbxkhryextaymkn.supabase.co';

const SUPABASE_ANON_KEY =
  safeEnv.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y2hjaGJ4a2hyeWV4dGF5bWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk2ODcsImV4cCI6MjA4MzMzNTY4N30.kX6FlTuPkl7XfycwVuZN2mI6e3ed8NaDUoyAHy9L3nc';

/**
 * CLIENTE SUPABASE ISOLADO PARA O PORTAL
 * 
 * Configurado para NÃO persistir sessão e NÃO detectar sessão na URL.
 * Isso garante que o acesso ao portal seja sempre "ANON" (ou controlado pelo token do portal),
 * evitando conflitos com a sessão de operador logada no mesmo navegador.
 */
export const supabasePortal = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'cm_portal_auth_noop', // Key dummy para garantir isolamento
  },
});
