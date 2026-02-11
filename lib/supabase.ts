
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://hzchchbxkhryextaymkn.supabase.co';

// ✅ IMPORTANTE: Chave pública (Anon) ou Publishable Key do Supabase
const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_S3HLqCSMKyMprrOCoo6FHQ_Lstki7QA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
