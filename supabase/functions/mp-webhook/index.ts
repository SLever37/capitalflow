
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

// Helpers de Data
const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
};

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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
    
    // Atualiza registro de log de cobrança se existir
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
            return json({ ok: true, warning: "Loan data not found for auto-process" });
        }

        // Evita duplicidade: Se parcela já estiver paga, para.
        if (inst.status === 'PAID') {
             return json({ ok: true, message: "Installment already paid" });
        }

        const amountPaid = Number(payment.transaction_amount);
        const paymentType = metadata.payment_type || 'RENEW_INTEREST';
        const profileId = metadata.profile_id || loan.profile_id;
        const sourceId = metadata.source_id || loan.source_id;

        // B. Calcular "Próximo Estado"
        // Usa string simples para garantir compatibilidade com sobrecarga TEXT se existir
        // ou falhar claramente se exigir UUID (mas preferimos tentar TEXT primeiro para evitar ambiguidade dupla)
        let rpcParams: any = {
            p_idempotency_key: String(paymentId), 
            p_loan_id: loan.id,
            p_installment_id: inst.id,
            p_profile_id: profileId,
            p_operator_id: profileId, // No webhook usamos o próprio dono
            p_source_id: sourceId,
            p_amount_to_pay: amountPaid,
            p_notes: `Pagamento via PIX Portal (${paymentType === 'FULL' ? 'Quitação' : 'Renovação'})`,
            p_category: 'RECEITA'
        };

        // --- CÁLCULO FINANCEIRO DO CONTRATO ---
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
                p_new_due_date: inst.due_date,
                p_new_principal_remaining: 0,
                p_new_interest_remaining: 0,
                p_new_scheduled_principal: 0,
                p_new_scheduled_interest: 0,
                p_new_amount: 0
            };

        } else {
            const currentDueDate = inst.due_date || loan.start_date;
            // Simplificação para webhook: assume ciclo 30 dias (para Giro/Mensal)
            const d = new Date(currentDueDate);
            d.setUTCDate(d.getUTCDate() + 30);
            const newDate = d.toISOString().split('T')[0];
            
            const principalBase = Number(inst.principal_remaining);
            const nextInterest = principalBase * (Number(loan.interest_rate) / 100);

            rpcParams = {
                ...rpcParams,
                p_payment_type: 'PAYMENT_PARTIAL',
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

        // C. Executar Transação Atômica (Ledger + Status)
        const { error: rpcError } = await supabase.rpc('process_payment_atomic', rpcParams);

        if (rpcError) {
            console.error("Erro na RPC de Baixa Automática:", rpcError);
            return json({ ok: false, error: "Auto-process failed: " + rpcError.message });
        }

        // =================================================================
        // D. TAXA MP (1%) - Lançamento Automático de Custo
        // =================================================================
        const mpFee = amountPaid * 0.01;
        
        if (mpFee > 0) {
            // 1. Registrar no Ledger (Transacoes) como Despesa
            await supabase.from('transacoes').insert({
                loan_id: loan.id,
                profile_id: profileId,
                source_id: sourceId,
                date: new Date().toISOString(),
                type: 'TAXA_MP',
                amount: -mpFee, // Valor negativo (Saída/Custo)
                principal_delta: 0,
                interest_delta: 0,
                late_fee_delta: 0,
                category: 'DESPESA_FINANCEIRA',
                notes: `Taxa Mercado Pago (1%): R$ ${mpFee.toFixed(2)}`
            });

            // 2. Deduzir do Lucro Líquido (Interest Balance) do Perfil
            const { data: profile } = await supabase.from('perfis').select('interest_balance').eq('id', profileId).single();
            if (profile) {
                await supabase.from('perfis')
                    .update({ interest_balance: (Number(profile.interest_balance) || 0) - mpFee })
                    .eq('id', profileId);
            }
        }

        // E. Criar Notificação para o Operador
        await supabase.from('sinalizacoes_pagamento').insert({
            client_id: loan.client_id,
            loan_id: loan.id,
            profile_id: profileId,
            tipo_intencao: 'PAGAR_PIX',
            status: 'APROVADO',
            review_note: `Automação PIX: R$ ${amountPaid.toFixed(2)} recebidos. Taxa MP: R$ ${mpFee.toFixed(2)}.`,
            reviewed_at: new Date().toISOString()
        });
    }

    return json({ ok: true, processed: true });

  } catch (e: any) {
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
});
