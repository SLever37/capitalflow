import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://hzchchbxkhryextaymkn.supabase.co';

// ✅ IMPORTANTE: aqui tem que ser a "anon public" do Supabase (geralmente começa com eyJ...)
const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'COLE_AQUI_SUA_ANON_PUBLIC_KEY_DO_SUPABASE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);