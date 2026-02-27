import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: any;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseSignature(sig: string) {
  // Exemplo esperado: "ts=1700000000,v1=abcdef..."
  const out: Record<string, string> = {};
  for (const part of sig.split(",")) {
    const [k, v] = part.split("=");
    if (k && v) out[k.trim()] = v.trim();
  }
  return out;
}

async function verifyMercadoPagoSignature(req: Request, body: any, secret: string) {
  const xSignature = req.headers.get("x-signature") || "";
  const xRequestId = req.headers.get("x-request-id") || "";
  if (!xSignature || !xRequestId) return false;

  const parsed = parseSignature(xSignature);
  const ts = parsed.ts || "";
  const v1 = parsed.v1 || "";
  if (!ts || !v1) return false;

  const dataId = body?.data?.id || body?.resource || "";
  if (!dataId) return false;

  // Manifest compatível com docs do MP
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signatureHex === v1;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MP_ACCESS_TOKEN || !MP_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: "Missing env vars" }, 500);
    }

    const body = await req.json();

    // Validação de assinatura (bloqueia spoof/replay básico)
    const validSignature = await verifyMercadoPagoSignature(req, body, MP_WEBHOOK_SECRET);
    if (!validSignature) {
      return json({ ok: false, error: "Invalid webhook signature" }, 401);
    }

    if (body?.type !== "payment" && body?.topic !== "payment") {
      return json({ ok: true, ignored: true });
    }

    const paymentId = body?.data?.id || body?.resource;
    if (!paymentId) return json({ ok: false, error: "Missing payment id" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Consulta status real no MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      return json({ ok: false, step: "mp_fetch", error: "Failed to fetch payment from MP" }, 502);
    }

    const payment = await mpRes.json();
    const status = payment?.status;
    const metadata = payment?.metadata || {};

    await supabase
      .from("payment_charges")
      .update({
        provider_status: status,
        status: status === "approved" ? "PAID" : "PENDING",
        paid_at: status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        provider_payload: payment,
      })
      .eq("provider_payment_id", String(paymentId));

    if (status === "approved" && metadata.loan_id && metadata.installment_id) {
      const { data: loan, error: loanErr } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", metadata.loan_id)
        .single();

      const { data: inst, error: instErr } = await supabase
        .from("parcelas")
        .select("*")
        .eq("id", metadata.installment_id)
        .single();

      if (loanErr || instErr || !loan || !inst) {
        return json({ ok: true, warning: "Loan/installment not found for auto-process" });
      }

      if (inst.status === "PAID") {
        return json({ ok: true, message: "Installment already paid" });
      }

      const amountPaid = Number(payment.transaction_amount);
      const paymentType = metadata.payment_type || "RENEW_INTEREST";
      const profileId = metadata.profile_id || loan.profile_id;
      const sourceId = metadata.source_id || loan.source_id;

      // VERIFICAÇÃO DE IDEMPOTÊNCIA EXTERNA
      const idempotencyKey = String(paymentId);
      const { data: existingTransactions } = await supabase
        .from("transacoes")
        .select("id, idempotency_key")
        .or(`idempotency_key.eq.${idempotencyKey},idempotency_key.eq.${idempotencyKey}_PROFIT`)
        .limit(1);

      if (existingTransactions && existingTransactions.length > 0) {
        console.log("[mp-webhook] Transação já processada (idempotência):", idempotencyKey);
        return json({ ok: true, message: "Transação já processada", idempotent: true });
      }

      // Cálculo de deltas para a RPC v2 (late_fee → interest → principal)
      const principalDue = Number(inst.principal_remaining) || 0;
      const interestDue = Number(inst.interest_remaining) || 0;
      const lateFeeDue = Number(inst.late_fee_accrued) || 0;

      let remaining = amountPaid;
      const lateFeeDelta = Math.max(0, Math.min(remaining, lateFeeDue));
      remaining -= lateFeeDelta;
      const interestDelta = Math.max(0, Math.min(remaining, interestDue));
      remaining -= interestDelta;
      const principalDelta = Math.max(0, Math.min(remaining, principalDue));

      const rpcParams = {
        p_idempotency_key: idempotencyKey,
        p_loan_id: loan.id,
        p_installment_id: inst.id,
        p_profile_id: profileId,
        p_operator_id: profileId,
        p_principal_amount: principalDelta,
        p_interest_amount: interestDelta,
        p_late_fee_amount: lateFeeDelta,
        p_payment_date: new Date().toISOString(),
      };

      const { error: rpcError } = await supabase.rpc("process_payment_atomic_v2", rpcParams);
      if (rpcError) {
        console.error("[mp-webhook] rpc error:", rpcError);
        // Não falhar se parcela já foi paga (idempotência)
        if (!String(rpcError.message).includes("Parcela já quitada")) {
          return json({ ok: false, error: "Auto-process failed: " + rpcError.message }, 500);
        }
        // Se foi idempotência, retornar sucesso
        return json({ ok: true, message: "Idempotência: parcela já quitada" });
      }

      // Taxa MP de 1% (se mantiver essa regra de negócio)
      const mpFee = amountPaid * 0.01;
      if (mpFee > 0) {
        await supabase.from("transacoes").insert({
          loan_id: loan.id,
          profile_id: profileId,
          source_id: sourceId,
          date: new Date().toISOString(),
          type: "TAXA_MP",
          amount: -mpFee,
          principal_delta: 0,
          interest_delta: 0,
          late_fee_delta: 0,
          category: "DESPESA_FINANCEIRA",
          notes: `Taxa Mercado Pago (1%): R$ ${mpFee.toFixed(2)}`,
        });

        const { data: profile } = await supabase
          .from("perfis")
          .select("interest_balance")
          .eq("id", profileId)
          .single();

        if (profile) {
          await supabase
            .from("perfis")
            .update({ interest_balance: (Number(profile.interest_balance) || 0) - mpFee })
            .eq("id", profileId);
        }
      }

      await supabase.from("sinalizacoes_pagamento").insert({
        client_id: loan.client_id,
        loan_id: loan.id,
        profile_id: profileId,
        tipo_intencao: "PAGAR_PIX",
        status: "APROVADO",
        review_note: `Automação PIX: R$ ${amountPaid.toFixed(2)} recebidos. Taxa MP: R$ ${mpFee.toFixed(2)}.`,
        reviewed_at: new Date().toISOString(),
      });
    }

    return json({ ok: true, processed: true });
  } catch (e: any) {
    console.error("[mp-webhook] fatal:", e?.message || e);
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
});
