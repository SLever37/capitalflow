import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

declare const Deno: any;

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await req.json();

    // Mercado Pago manda vários tipos de evento
    if (body.type !== "payment") {
      return new Response(JSON.stringify({ ignored: true }), { status: 200 });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response("Missing payment id", { status: 400 });
    }

    // Buscar pagamento no Mercado Pago
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`,
        },
      }
    );

    const payment = await mpRes.json();

    const providerStatus = payment.status;
    const externalReference = payment.external_reference;

    // Atualiza cobrança no Supabase
    const supabaseRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/payment_charges?provider_payment_id=eq.${paymentId}`,
      {
        method: "PATCH",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider_status: providerStatus,
          status: providerStatus === "approved" ? "PAID" : "PENDING",
          paid_at: providerStatus === "approved" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
          raw_provider_payload: payment,
        }),
      }
    );

    if (!supabaseRes.ok) {
      const err = await supabaseRes.text();
      throw new Error(err);
    }

    return new Response(
      JSON.stringify({ ok: true, providerStatus }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500 }
    );
  }
});