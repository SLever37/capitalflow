import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
// Add declaration for Deno to fix TypeScript compilation errors in environments without Deno types
declare const Deno: any;
const corsHeaders = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
serve(async (req) => {
// 1. Handle CORS
if (req.method === 'OPTIONS') {
return new Response('ok', { headers: corsHeaders })
}
try {
const supabaseAdmin = createClient(
Deno.env.get('SUPABASE_URL') ?? '',
Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)
// 2. Validação de Payload
const body = await req.json();
const { profile_id, email, password } = body;
if (!profile_id || !email || !password) {
return new Response(
JSON.stringify({ ok: false, error: 'Parâmetros obrigatórios ausentes: profile_id, email ou password.' }),
{ headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
);
}
const cleanEmail = email.toLowerCase().trim();
// 3. Buscar usuário de forma eficiente (sem listUsers pesado)
const { data: userData, error: getError } = await supabaseAdmin.auth.admin.getUserByEmail(cleanEmail);
    // Ignora erro se for apenas usuário não encontrado
    if (getError && !getError.message.includes('User not found')) {
      throw new Error(`Erro ao consultar Auth: ${getError.message}`);
    }

    let authUserId: string;

    if (userData?.user) {
      // Usuário já existe: Garante que a senha bate com o access_code/senha_acesso atual
      const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userData.user.id,
        { password: password }
      );
      if (updateError) throw new Error(`Erro ao atualizar senha: ${updateError.message}`);
      authUserId = updated.user.id;
    } else {
      // Usuário novo: Cria credencial definitiva
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
      });
      if (createError) throw new Error(`Erro ao criar credencial: ${createError.message}`);
      authUserId = created.user.id;
    }

    // 4. Sincronização de Banco (Obrigatório para RLS)
    const { error: profileError } = await supabaseAdmin
      .from('perfis')
      .update({ user_id: authUserId })
      .eq('id', profile_id);

    if (profileError) {
      throw new Error(`Auth OK, mas falha ao vincular perfil: ${profileError.message}`);
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: authUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error(`[AUTH_TASK_ERROR] ${error.message}`);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});