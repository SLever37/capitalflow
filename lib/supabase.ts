import { createClient } from '@supabase/supabase-js';

// ⚠️ PRODUÇÃO: coloque isso em .env
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...

// Helper seguro para obter variáveis de ambiente
const getEnv = (key: string) => {
  // 1. Tenta import.meta.env (Padrão Vite)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  
  // 2. Tenta process.env (Definido no vite.config.ts ou Node)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  return undefined;
};

const SUPABASE_URL =
  getEnv('VITE_SUPABASE_URL') ||
  'https://hzchchbxkhryextaymkn.supabase.co';

const SUPABASE_ANON_KEY =
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y2hjaGJ4a2hyeWV4dGF5bWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk2ODcsImV4cCI6MjA4MzMzNTY4N30.kX6FlTuPkl7XfycwVuZN2mI6e3ed8NaDUoyAHy9L3nc';

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL não definida');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY não definida');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// DEBUG CONTROLADO (remover depois)
const isDev = (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

if (isDev) {
  console.log('[SUPABASE] url=', SUPABASE_URL);
  console.log('[SUPABASE] keyPrefix=', SUPABASE_ANON_KEY.slice(0, 12));
}