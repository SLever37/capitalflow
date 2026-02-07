
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: any) => {
  // Tratamento de CORS Preflight (Browser)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Parse do Corpo da Requisição
    let body;
    try {
        body = await req.json();
    } catch (e) {
        throw new Error("Corpo da requisição inválido (JSON esperado).");
    }

    const { amount, payer_name, payer_email, payer_doc, loan_id, installment_id, payment_type, profile_id, source_id } = body;

    // 2. Validações
    if (!amount || Number(amount) <= 0) {
      throw new Error("Valor inválido.");
    }

    // 3. Inicializar Supabase Admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Resolver Token do Mercado Pago (Global ou Perfil)
    let MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

    if (profile_id) {
        const { data: profile } = await supabaseClient
            .from('perfis')
            .select('mp_access_token')
            .eq('id', profile_id)
            .single();
        
        if (profile?.mp_access_token && profile.mp_access_token.trim().length > 10) {
            MP_ACCESS_TOKEN = profile.mp_access_token;
            console.log(`Usando token personalizado para o perfil ${profile_id}`);
        }
    }

    if (!MP_ACCESS_TOKEN) {
      throw new Error("Token do Mercado Pago não configurado. Verifique as configurações do perfil.");
    }

    // 5. Gerar ID de Referência (Idempotência)
    const external_reference = crypto.randomUUID();

    // 6. Payload para o Mercado Pago
    const mpPayload = {
      transaction_amount: Number(amount),
      description: `Pagamento CapitalFlow ${loan_id ? `- Contrato ${loan_id.slice(0,8)}` : '- Aporte'}`,
      payment_method_id: "pix",
      external_reference,
      payer: {
        email: payer_email || "cliente@capitalflow.app",
        first_name: payer_name || "Cliente",
        identification: payer_doc ? {
          type: payer_doc.length > 11 ? "CNPJ" : "CPF",
          number: payer_doc.replace(/\D/g, "")
        } : undefined
      },
      // Metadados para Webhook
      metadata: {
        loan_id,
        installment_id,
        payment_type,
        profile_id,
        source_id
      }
    };

    // 7. Chamada à API do Mercado Pago
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": external_reference
      },
      body: JSON.stringify(mpPayload)
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("Erro MP:", mpData);
      const msg = mpData.message || "Erro desconhecido no Mercado Pago";
      throw new Error(`Mercado Pago recusou: ${msg}`);
    }

    const qr_code = mpData.point_of_interaction?.transaction_data?.qr_code;
    const qr_code_base64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
    const paymentId = String(mpData.id);

    // 8. Salvar Log no Supabase
    await supabaseClient.from('payment_charges').insert({
        charge_id: external_reference,
        provider_payment_id: paymentId,
        loan_id,
        installment_id,
        profile_id: profile_id, // Importante para o webhook saber de quem é
        amount,
        payment_type,
        status: "PENDING",
        provider_status: mpData.status,
        qr_code,
        qr_code_base64,
        created_at: new Date().toISOString()
    });

    // 9. Retorno Sucesso
    return new Response(JSON.stringify({
      ok: true,
      charge_id: external_reference,
      provider_payment_id: paymentId,
      status: mpData.status,
      qr_code,
      qr_code_base64,
      external_reference
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Retorna 400 para que o cliente não tente retry infinito
    })
  }
})