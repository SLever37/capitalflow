// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Helper seguro para obter variáveis de ambiente
const getEnv = (key: string) => {
  // 1) Vite
  try {
    const v = (import.meta as any)?.env?.[key];
    if (v) return v;
  } catch {}

  // 2) Node / build tools
  try {
    const v = (globalThis as any)?.process?.env?.[key];
    if (v) return v;
  } catch {}

  return undefined;
};

const SUPABASE_URL =
  getEnv('VITE_SUPABASE_URL') || 'https://hzchchbxkhryextaymkn.supabase.co';

const SUPABASE_ANON_KEY =
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y2hjaGJ4a2hyeWV4dGF5bWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk2ODcsImV4cCI6MjA4MzMzNTY4N30.kX6FlTuPkl7XfycwVuZN2mI6e3ed8NaDUoyAHy9L3nc';

if (!SUPABASE_URL) throw new Error('SUPABASE_URL não definida');
if (!SUPABASE_ANON_KEY) throw new Error('SUPABASE_ANON_KEY não definida');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// DEBUG (remover depois)
console.log('[SUPABASE] url=', SUPABASE_URL);
console.log('[SUPABASE] keyPrefix=', SUPABASE_ANON_KEY.slice(0, 12));

// ✅ ESTE LOG É O PRÓXIMO PASSO PARA DESTRAVAR CLIENTES/CONTRATOS
supabase.auth.getSession().then(({ data }) => {
  console.log('[AUTH][SESSION] uid=', data.session?.user?.id ?? null);
});

supabase.auth.onAuthStateChange((event, session) => {
  console.log('[AUTH][CHANGE] event=', event, 'uid=', session?.user?.id ?? null);
});