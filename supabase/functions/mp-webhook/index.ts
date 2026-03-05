
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: any;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GLOBAL_MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: "Missing env vars" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    if (body?.type !== "payment" && body?.topic !== "payment") {
      return json({ ok: true, ignored: true });
    }

    const paymentId = body?.data?.id || body?.resource;
    if (!paymentId) return json({ ok: false, error: "Missing payment id" }, 400);

    // 1. Buscar a cobrança no banco para saber quem é o operador
    const { data: charge } = await supabase
      .from("payment_charges")
      .select("profile_id, loan_id, installment_id")
      .eq("provider_payment_id", String(paymentId))
      .maybeSingle();

    // 2. Buscar Credenciais MP do Operador (Multi-Conta)
    let accessToken = GLOBAL_MP_ACCESS_TOKEN;
    if (charge?.profile_id) {
      const { data: mpConfig } = await supabase
        .from("perfis_config_mp")
        .select("mp_access_token")
        .eq("profile_id", charge.profile_id)
        .maybeSingle();
      
      if (mpConfig?.mp_access_token) {
        accessToken = mpConfig.mp_access_token;
      }
    }

    if (!accessToken) return json({ ok: false, error: "No access token available" }, 400);

    // 3. Consulta status real no MP usando o token correto
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mpRes.ok) return json({ ok: false, error: "Failed to fetch payment from MP" }, 502);

    const payment = await mpRes.json();
    const status = payment?.status;
    const metadata = payment?.metadata || {};

    // Atualizar status da cobrança
    await supabase
      .from("payment_charges")
      .update({
        provider_status: status,
        status: status === "approved" ? "PAID" : "PENDING",
        paid_at: status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("provider_payment_id", String(paymentId));

    if (status === "approved") {
      const loanId = metadata.loan_id || charge?.loan_id;
      const instId = metadata.installment_id || charge?.installment_id;

      if (!loanId || !instId) return json({ ok: true, warning: "Missing metadata for processing" });

      // Processar pagamento atômico via RPC v2
      const { error: rpcError } = await supabase.rpc("process_payment_atomic_v2", {
        p_loan_id: loanId,
        p_installment_id: instId,
        p_amount: Number(payment.transaction_amount),
        p_payment_method: "PIX",
        p_payment_date: new Date().toISOString(),
        p_idempotency_key: `mp-${paymentId}`
      });

      if (rpcError && !rpcError.message.includes("Parcela já quitada")) {
        return json({ ok: false, error: rpcError.message }, 500);
      }

      // Registrar intenção aprovada para histórico
      await supabase.from("payment_intents").insert({
        loan_id: loanId,
        installment_id: instId,
        profile_id: charge?.profile_id || metadata.profile_id,
        amount: Number(payment.transaction_amount),
        method: "PIX",
        status: "APPROVED",
        notes: `Pagamento PIX Automático (MP ID: ${paymentId})`
      });
    }

    return json({ ok: true, status });

  } catch (err: any) {
    return json({ ok: false, error: err.message }, 500);
  }
});
