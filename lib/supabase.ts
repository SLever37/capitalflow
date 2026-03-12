import { createClient } from '@supabase/supabase-js';

function getEnvVar(key: string): string {
  try {
    const val = (import.meta as any)?.env?.[key];
    if (val) return String(val).trim();
  } catch {}

  return '';
}

function requireEnv(key: string): string {
  const val = getEnvVar(key);
  if (!val || val === 'undefined' || val === 'null') {
    if (key === 'VITE_SUPABASE_URL') return 'https://hzchchbxkhryextaymkn.supabase.co';
    if (key === 'VITE_SUPABASE_ANON_KEY') return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y2hjaGJ4a2hyeWV4dGF5bWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk2ODcsImV4cCI6MjA4MzMzNTY4N30.kX6FlTuPkl7XfycwVuZN2mI6e3ed8NaDUoyAHy9L3nc';
    
    console.warn(`[ENV] Variável obrigatória ausente: ${key}. Usando valor de fallback.`);
    return 'placeholder-key';
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