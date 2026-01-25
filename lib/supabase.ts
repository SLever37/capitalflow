
import { createClient } from '@supabase/supabase-js';

// Tenta pegar das variáveis de ambiente (Cloudflare/Vercel), se não achar, usa o fallback (apenas para dev local)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hzchchbxkhryextaymkn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_S3HLqCSMKyMprrOCoo6FHQ_Lstki7QA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
