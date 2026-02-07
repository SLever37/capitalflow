
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: any;

serve(async (req) => {
  try {
    // CORS e Método
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
    }
    
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await req.json();
    const { amount, payer_name, payer_email, payer_doc, loan_id, installment_id, payment_type, profile_id, source_id } = body;

    // Validação Básica
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ ok: false, error: "Valor inválido" }), { status: 400 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Resolver Token do Mercado Pago (Global ou Perfil)
    let MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

    if (profile_id) {
        const { data: profile } = await supabase
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
      return new Response(JSON.stringify({ ok: false, error: "MP_ACCESS_TOKEN não configurado" }), { status: 500 });
    }

    // 2. Gerar UUID de referência externa
    const external_reference = crypto.randomUUID();

    // 3. Montar Payload para o Mercado Pago
    const mpPayload = {
      transaction_amount: Number(amount),
      description: `Pagamento Contrato ${loan_id?.slice(0,8)} - ${payment_type}`,
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
      // Metadados que voltarão no Webhook
      metadata: {
        loan_id,
        installment_id,
        payment_type,
        profile_id,
        source_id
      }
    };

    // 4. Chamar API do Mercado Pago
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
      return new Response(JSON.stringify({ ok: false, error: mpData.message || "Erro no Mercado Pago" }), { status: 500 });
    }

    const qr_code = mpData.point_of_interaction?.transaction_data?.qr_code;
    const qr_code_base64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
    const paymentId = String(mpData.id);

    // 5. Salvar registro na tabela payment_charges (Supabase)
    await supabase.from('payment_charges').insert({
        charge_id: external_reference, // Usamos nosso UUID como ID interno
        provider_payment_id: paymentId,
        loan_id,
        installment_id,
        profile_id,
        amount,
        payment_type, // RENEW_INTEREST, FULL, LEND_MORE
        status: "PENDING",
        provider_status: mpData.status,
        qr_code,
        qr_code_base64,
        created_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      ok: true,
      charge_id: external_reference,
      provider_payment_id: paymentId,
      status: mpData.status,
      qr_code,
      qr_code_base64,
      external_reference
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
  }
});
