import { createClient } from '@supabase/supabase-js';

/**
 * Helper para acesso seguro ao ambiente.
 * Previne "TypeError: Cannot read properties of undefined" ao acessar import.meta.env
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

// Configurações baseadas no ambiente ou fallback estático
const SUPABASE_URL =
  safeEnv.VITE_SUPABASE_URL ||
  'https://hzchchbxkhryextaymkn.supabase.co';

const SUPABASE_ANON_KEY =
  safeEnv.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y2hjaGJ4a2hyeWV4dGF5bWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk2ODcsImV4cCI6MjA4MzMzNTY4N30.kX6FlTuPkl7XfycwVuZN2mI6e3ed8NaDUoyAHy9L3nc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'cm_supabase_auth',
    lock: async (name, acquireTimeout, fn) => {
      return await fn();
    }
  },
});
