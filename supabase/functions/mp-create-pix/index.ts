import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: any;

const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "*";

const baseCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = APP_ORIGIN === "*" ? "*" : origin === APP_ORIGIN ? origin : APP_ORIGIN;
  return { ...baseCorsHeaders, "Access-Control-Allow-Origin": allowOrigin };
}

function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "Method Not Allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN") || "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !MP_ACCESS_TOKEN) {
      return json(req, { ok: false, error: "Missing env vars" }, 500);
    }

    const token = getBearerToken(req);
    if (!token) return json(req, { ok: false, error: "Unauthorized" }, 401);

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !authData?.user?.id) {
      return json(req, { ok: false, error: "Unauthorized: invalid token" }, 401);
    }

    const { data: callerProfile, error: callerErr } = await supabaseAdmin
      .from("perfis")
      .select("id, user_id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (callerErr || !callerProfile?.id) {
      return json(req, { ok: false, error: "Forbidden: profile not found" }, 403);
    }

    const body = await req.json();
    const {
      amount,
      payer_name,
      payer_email,
      payer_doc,
      loan_id,
      installment_id,
      payment_type,
    } = body || {};

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return json(req, { ok: false, error: "Valor inválido" }, 400);
    }
    if (!loan_id || !installment_id) {
      return json(req, { ok: false, error: "loan_id e installment_id são obrigatórios" }, 400);
    }

    // Valida contrato e ownership
    const { data: loan, error: loanErr } = await supabaseAdmin
      .from("contratos")
      .select("id, profile_id, source_id")
      .eq("id", loan_id)
      .single();

    if (loanErr || !loan?.id) {
      return json(req, { ok: false, error: "Contrato não encontrado" }, 404);
    }

    if (String(loan.profile_id) !== String(callerProfile.id)) {
      return json(req, { ok: false, error: "Forbidden: contrato não pertence ao usuário" }, 403);
    }

    const { data: inst, error: instErr } = await supabaseAdmin
      .from("parcelas")
      .select("id, status, contrato_id, loan_id")
      .eq("id", installment_id)
      .single();

    if (instErr || !inst?.id) {
      return json(req, { ok: false, error: "Parcela não encontrada" }, 404);
    }

    const installmentLoanId = (inst as any).loan_id || (inst as any).contrato_id;
    if (String(installmentLoanId) !== String(loan.id)) {
      return json(req, { ok: false, error: "Parcela não pertence ao contrato informado" }, 400);
    }

    if (inst.status === "PAID") {
      return json(req, { ok: false, error: "Parcela já está paga" }, 409);
    }

    const external_reference = crypto.randomUUID();

    const mpPayload = {
      transaction_amount: amountNum,
      description: `Pagamento Contrato ${String(loan.id).slice(0, 8)} - ${payment_type || "RENEW_INTEREST"}`,
      payment_method_id: "pix",
      external_reference,
      payer: {
        email: payer_email || "cliente@capitalflow.app",
        first_name: payer_name || "Cliente",
        identification: payer_doc
          ? {
              type: String(payer_doc).replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF",
              number: String(payer_doc).replace(/\D/g, ""),
            }
          : undefined,
      },
      metadata: {
        loan_id: loan.id,
        installment_id: inst.id,
        payment_type: payment_type || "RENEW_INTEREST",
        profile_id: loan.profile_id, // DERIVADO DO BANCO
        source_id: loan.source_id,   // DERIVADO DO BANCO
      },
    };

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": external_reference,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("[mp-create-pix] MP error:", mpData);
      return json(req, { ok: false, error: mpData?.message || "Erro no Mercado Pago" }, 502);
    }

    const qr_code = mpData?.point_of_interaction?.transaction_data?.qr_code || null;
    const qr_code_base64 = mpData?.point_of_interaction?.transaction_data?.qr_code_base64 || null;
    const paymentId = String(mpData.id);

    const { error: chargeErr } = await supabaseAdmin.from("payment_charges").insert({
      charge_id: external_reference,
      provider_payment_id: paymentId,
      loan_id: loan.id,
      installment_id: inst.id,
      profile_id: loan.profile_id,
      amount: amountNum,
      payment_type: payment_type || "RENEW_INTEREST",
      status: "PENDING",
      provider_status: mpData.status,
      qr_code,
      qr_code_base64,
      created_at: new Date().toISOString(),
    });

    if (chargeErr) {
      console.error("[mp-create-pix] charge insert error:", chargeErr);
      return json(req, { ok: false, error: "Erro ao registrar cobrança" }, 500);
    }

    return json(req, {
      ok: true,
      charge_id: external_reference,
      provider_payment_id: paymentId,
      status: mpData.status,
      qr_code,
      qr_code_base64,
      external_reference,
    });
  } catch (err: any) {
    console.error("[mp-create-pix] fatal:", err?.message || err);
    return json(req, { ok: false, error: err?.message || "Internal error" }, 500);
  }
});
