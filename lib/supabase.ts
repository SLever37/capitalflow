import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://hzchchbxkhryextaymkn.supabase.co';

// ✅ IMPORTANTE: aqui tem que ser a "anon public" do Supabase (geralmente começa com eyJ...)
const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y2hjaGJ4a2hyeWV4dGF5bWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk2ODcsImV4cCI6MjA4MzMzNTY4N30.kX6FlTuPkl7XfycwVuZN2mI6e3ed8NaDUoyAHy9L3nc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);