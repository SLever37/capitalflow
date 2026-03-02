// features/support/services/agreementService.ts
import { supabase } from "../../../lib/supabase";
import { Agreement, AgreementInstallment, UserProfile } from "../../../types";
import { generateUUID } from "../../../utils/generators";
import { isUUID, safeUUID } from "../../../utils/uuid";

export const agreementService = {
  async createAgreement(
    loanId: string,
    agreementData: Omit<Agreement, "id" | "createdAt" | "status" | "installments">,
    installments: AgreementInstallment[],
    profileId: string
  ) {
    const agreementId = generateUUID();
    const now = new Date().toISOString();

    // 1) Criar Header do Acordo
    const { error: headerError } = await supabase.from("acordos_inadimplencia").insert({
      id: agreementId,
      loan_id: loanId,
      profile_id: profileId,
      tipo_acordo: agreementData.type,
      total_divida_base: agreementData.totalDebtAtNegotiation,
      total_negociado: agreementData.negotiatedTotal,
      juros_aplicado: agreementData.interestRate || 0,
      qtd_parcelas: agreementData.installmentsCount,
      periodicidade: agreementData.frequency,
      status: "ACTIVE",
      created_at: now,
    });
    if (headerError) throw new Error("Erro ao criar acordo: " + headerError.message);

    // 2) Criar Parcelas
    const installmentsPayload = installments.map((inst) => ({
      id: generateUUID(),
      acordo_id: agreementId,
      profile_id: profileId,
      numero: inst.number,
      data_vencimento: inst.dueDate,
      valor: inst.amount,
      status: "PENDING",
      valor_pago: 0,
    }));

    const { error: instError } = await supabase.from("acordo_parcelas").insert(installmentsPayload);
    if (instError) throw new Error("Erro ao gerar parcelas do acordo: " + instError.message);

    return agreementId;
  },

  async processPayment(
    agreement: Agreement,
    installment: AgreementInstallment,
    amount: number,
    sourceId: string,
    user: UserProfile
  ) {
    // ✅ Dono real (owner) para RLS / segregação correta
    const ownerId = (user as any).supervisor_id || user.id;

    // 1) Atualizar parcela
    const newPaidAmount = installment.paidAmount + amount;
    let newStatus = installment.status;

    // Tolerância de R$ 0,10
    if (newPaidAmount >= installment.amount - 0.1) {
      newStatus = "PAID";
    } else {
      newStatus = "PARTIAL";
    }

    const { error: instError } = await supabase
      .from("acordo_parcelas")
      .update({
        valor_pago: newPaidAmount,
        status: newStatus,
        data_pagamento: new Date().toISOString(),
      })
      .eq("id", installment.id);

    if (instError) throw instError;

    // 2) Registrar pagamento (perfil = ownerId)
    const { error: payErr } = await supabase.from("acordo_pagamentos").insert({
      id: generateUUID(),
      parcela_id: installment.id,
      acordo_id: agreement.id,
      profile_id: ownerId,
      amount: amount,
      date: new Date().toISOString(),
    });
    if (payErr) throw payErr;

    // 3) Atualizar Caixa (Ledger Geral) (perfil = ownerId)
    const { error: txErr } = await supabase.from("transacoes").insert({
      id: generateUUID(),
      loan_id: agreement.loanId,
      agreement_id: agreement.id,
      profile_id: ownerId,
      source_id: sourceId,
      date: new Date().toISOString(),
      type: "AGREEMENT_PAYMENT",
      amount: amount,
      principal_delta: 0,
      interest_delta: 0,
      late_fee_delta: 0,
      category: "RECUPERACAO",
      notes: `Pagamento Acordo ${installment.number}/${agreement.installmentsCount}`,
    });
    if (txErr) throw txErr;

    // 4) Atualizar saldo da fonte
    const { error: balErr } = await supabase.rpc("adjust_source_balance", {
      p_source_id: safeUUID(sourceId),
      p_delta: amount,
    });
    if (balErr) throw balErr;

    // 5) Verificar Quitação Total do Acordo
    if (newStatus === "PAID") {
      const { count, error: countErr } = await supabase
        .from("acordo_parcelas")
        .select("*", { count: "exact", head: true })
        .eq("acordo_id", agreement.id)
        .neq("status", "PAID");

      if (countErr) throw countErr;

      if ((count || 0) === 0) {
        // Quitou acordo
        const { error: agErr } = await supabase
          .from("acordos_inadimplencia")
          .update({ status: "PAID" })
          .eq("id", agreement.id);
        if (agErr) throw agErr;

        // Marca parcelas do contrato como PAID (opcional, mas mantém consistência)
        const { error: parcelasErr } = await supabase
          .from("parcelas")
          .update({ status: "PAID", paid_total: 0 })
          .eq("loan_id", agreement.loanId)
          .neq("status", "PAID");
        if (parcelasErr) throw parcelasErr;
      }
    }
  },

  async breakAgreement(agreementId: string) {
    const { error } = await supabase
      .from("acordos_inadimplencia")
      .update({ status: "BROKEN" })
      .eq("id", agreementId);
    if (error) throw error;
  },
};