import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

    const body = await req.json();

    // Mercado Pago manda vários eventos. Para PIX geralmente vem como type=payment
    if (body?.type !== "payment") {
      return json({ ok: true, ignored: true });
    }

    const paymentId = body?.data?.id;
    if (!paymentId) return json({ ok: false, error: "Missing payment id" }, 400);

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(
        {
          ok: false,
          error: "Missing env vars",
          envCheck: {
            hasMpToken: !!MP_ACCESS_TOKEN,
            hasSupabaseUrl: !!SUPABASE_URL,
            hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
          },
        },
        500
      );
    }

    // 1) Buscar detalhes do pagamento no MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    const mpText = await mpRes.text();
    let payment: any = null;
    try {
      payment = mpText ? JSON.parse(mpText) : null;
    } catch {
      payment = { raw: mpText };
    }

    if (!mpRes.ok) {
      return json({ ok: false, step: "mp_fetch_payment", mp: payment }, 502);
    }

    const providerStatus = String(payment?.status ?? "unknown");

    // 2) Atualizar o registro no Supabase pelo provider_payment_id
    const patchBody: Record<string, any> = {
      provider_status: providerStatus,
      status: providerStatus === "approved" ? "PAID" : "PENDING",
      paid_at: providerStatus === "approved" ? new Date().toISOString() : null,
      provider_payload: payment,
      updated_at: new Date().toISOString(),
    };

    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/payment_charges?provider_payment_id=eq.${paymentId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(patchBody),
      }
    );

    const sbText = await sbRes.text();
    if (!sbRes.ok) {
      return json(
        { ok: false, step: "supabase_patch", error: sbText || sbRes.statusText },
        500
      );
    }

    return json({ ok: true, providerStatus, updated: sbText ? JSON.parse(sbText) : null });
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
});