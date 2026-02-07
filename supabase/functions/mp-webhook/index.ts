
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: any;

// Helper de resposta JSON
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Helpers de Data Simples (Adiciona dias UTC)
const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days); // Uso simples de Date (Edge roda em UTC)
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: "Missing env vars" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    // Filtro inicial: Apenas eventos de pagamento
    if (body?.type !== "payment" && body?.topic !== "payment") {
      return json({ ok: true, ignored: true });
    }

    const paymentId = body?.data?.id || body?.resource;
    if (!paymentId) return json({ ok: false, error: "Missing payment id" }, 400);

    // ✅ NOVO: Buscar qual token usar.
    // Primeiro, precisamos saber a quem pertence esse pagamento.
    // Consultamos payment_charges pelo ID do provedor (paymentId)
    const { data: chargeData } = await supabase
        .from('payment_charges')
        .select('profile_id')
        .eq('provider_payment_id', String(paymentId))
        .maybeSingle();

    let MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

    if (chargeData?.profile_id) {
        // Se encontramos o registro local, buscamos o token do perfil dono
        const { data: profile } = await supabase
            .from('perfis')
            .select('mp_access_token')
            .eq('id', chargeData.profile_id)
            .single();
        
        if (profile?.mp_access_token && profile.mp_access_token.trim().length > 10) {
            MP_ACCESS_TOKEN = profile.mp_access_token;
        }
    }

    if (!MP_ACCESS_TOKEN) {
        // Se não tiver token global nem específico, não tem como validar
        return json({ ok: false, error: "No MP Token available" }, 500);
    }

    // 1. Buscar detalhes atualizados no Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      return json({ ok: false, step: "mp_fetch", error: "Failed to fetch payment from MP" }, 502);
    }

    const payment = await mpRes.json();
    const status = payment.status;
    const metadata = payment.metadata || {};
    
    // Atualiza registro de log de cobrança
    await supabase.from('payment_charges')
      .update({
        provider_status: status,
        status: status === 'approved' ? 'PAID' : 'PENDING',
        paid_at: status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        provider_payload: payment
      })
      .eq('provider_payment_id', String(paymentId));

    // =================================================================
    // LÓGICA DE BAIXA AUTOMÁTICA (SOMENTE SE APROVADO)
    // =================================================================
    if (status === 'approved' && metadata.loan_id && metadata.installment_id) {
        
        // A. Buscar dados atuais do contrato
        const { data: loan, error: loanErr } = await supabase
            .from('contratos')
            .select('*')
            .eq('id', metadata.loan_id)
            .single();

        const { data: inst, error: instErr } = await supabase
            .from('parcelas')
            .select('*')
            .eq('id', metadata.installment_id)
            .single();

        if (loanErr || instErr || !loan || !inst) {
            console.error("Dados de contrato não encontrados para baixa automática", metadata);
            return json({ ok: true, warning: "Loan/Installment not found" });
        }

        if (inst.status === 'PAID') {
             return json({ ok: true, message: "Installment already paid" });
        }

        const amountPaid = Number(payment.transaction_amount);
        const paymentType = metadata.payment_type || 'RENEW_INTEREST';
        const profileId = metadata.profile_id || loan.profile_id;
        const sourceId = metadata.source_id || loan.source_id;

        // B. Preparar Parâmetros da RPC
        let rpcParams: any = {
            p_idempotency_key: crypto.randomUUID(),
            p_loan_id: loan.id,
            p_installment_id: inst.id,
            p_profile_id: profileId,
            p_operator_id: null, // Ação do Sistema
            p_source_id: sourceId,
            p_amount_to_pay: amountPaid,
            p_notes: `PIX Automático (${paymentType === 'FULL' ? 'Quitação' : 'Renovação'})`,
            p_category: 'RECEITA'
        };

        if (paymentType === 'FULL') {
            const principal = Number(inst.principal_remaining);
            const profit = Math.max(0, amountPaid - principal);

            rpcParams = {
                ...rpcParams,
                p_payment_type: 'PAYMENT_FULL',
                p_profit_generated: profit,
                p_principal_returned: principal,
                p_principal_delta: principal,
                p_interest_delta: profit,
                p_late_fee_delta: 0, 
                
                // Zera tudo
                p_new_start_date: loan.start_date, 
                p_new_due_date: inst.data_vencimento || inst.due_date,
                p_new_principal_remaining: 0,
                p_new_interest_remaining: 0,
                p_new_scheduled_principal: 0,
                p_new_scheduled_interest: 0,
                p_new_amount: 0
            };

        } else {
            // Lógica Simplificada de Renovação Automática (Avança 30 dias)
            // Em produção real, replicaria a lógica exata de strategies
            const currentDueDate = inst.data_vencimento || inst.due_date || loan.start_date;
            const newDate = addDays(currentDueDate, 30);
            
            const principalBase = Number(inst.principal_remaining);
            // Recalcula juros do próximo mês baseado na taxa do contrato
            const nextInterest = principalBase * (Number(loan.interest_rate) / 100);

            rpcParams = {
                ...rpcParams,
                p_payment_type: 'PAYMENT_PARTIAL', // ou 'RENEW_INTEREST' se mapeado no banco
                p_profit_generated: amountPaid,
                p_principal_returned: 0,
                p_principal_delta: 0,
                p_interest_delta: amountPaid,
                p_late_fee_delta: 0,

                // Renova
                p_new_start_date: currentDueDate, 
                p_new_due_date: newDate,
                p_new_principal_remaining: principalBase,
                p_new_interest_remaining: nextInterest,
                p_new_scheduled_principal: principalBase,
                p_new_scheduled_interest: nextInterest,
                p_new_amount: principalBase + nextInterest
            };
        }

        // C. Executar Transação Atômica
        const { error: rpcError } = await supabase.rpc('process_payment_atomic', rpcParams);

        if (rpcError) {
            console.error("Erro na RPC de Baixa Automática:", rpcError);
            return json({ ok: false, error: "Auto-process failed: " + rpcError.message });
        }

        // D. Taxa MP (1%)
        const mpFee = amountPaid * 0.01;
        if (mpFee > 0) {
            // Lança despesa e ajusta lucro
            await supabase.from('transacoes').insert({
                loan_id: loan.id,
                profile_id: profileId,
                source_id: sourceId,
                date: new Date().toISOString(),
                type: 'TAXA_MP',
                amount: -mpFee,
                principal_delta: 0,
                interest_delta: 0,
                late_fee_delta: 0,
                category: 'DESPESA_FINANCEIRA',
                notes: `Taxa Mercado Pago (1%): R$ ${mpFee.toFixed(2)}`
            });

            // Deduz do lucro
            const { data: profile } = await supabase.from('perfis').select('interest_balance').eq('id', profileId).single();
            if (profile) {
                await supabase.from('perfis')
                    .update({ interest_balance: (Number(profile.interest_balance) || 0) - mpFee })
                    .eq('id', profileId);
            }
        }

        // E. Notificação interna
        await supabase.from('sinalizacoes_pagamento').insert({
            client_id: loan.client_id,
            loan_id: loan.id,
            profile_id: profileId,
            tipo_intencao: 'PAGAR_PIX',
            status: 'APROVADO',
            review_note: `Automação PIX: R$ ${amountPaid.toFixed(2)} confirmados.`,
            reviewed_at: new Date().toISOString()
        });
    }

    return json({ ok: true, processed: true });

  } catch (e: any) {
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
});
