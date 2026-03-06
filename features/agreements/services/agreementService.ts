// /app/applet/features/agreements/services/agreementService.ts
import { supabase } from "../../../lib/supabase";
import { Agreement, AgreementInstallment, UserProfile } from "../../../types";
import { generateUUID } from "../../../utils/generators";
import { safeUUID } from "../../../utils/uuid";

/**
 * Banco (CHECK):
 * - juros_modo: PRO_RATA | FIXO | ZERO
 * - tipo: PARCELADO_COM_JUROS | PARCELADO_SEM_JUROS
 * - periodicidade: SEMANAL | QUINZENAL | MENSAL
 */
type JurosModoDB = "PRO_RATA" | "FIXO" | "ZERO";
type PeriodicidadeDB = "SEMANAL" | "QUINZENAL" | "MENSAL";
type TipoDB = "PARCELADO_COM_JUROS" | "PARCELADO_SEM_JUROS";

function safeNumber(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toISODateOnly(d: any): string {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  }
  return dt.toISOString().slice(0, 10);
}

function normalizePeriodicidade(v: any): PeriodicidadeDB {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "SEMANAL" || s === "QUINZENAL" || s === "MENSAL") return s;

  // mapeamentos comuns do front
  if (s === "WEEKLY") return "SEMANAL";
  if (s === "BIWEEKLY") return "QUINZENAL";
  if (s === "MONTHLY") return "MENSAL";

  return "MENSAL";
}

function normalizeJurosModo(v: any, interestRate: number): JurosModoDB {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "PRO_RATA" || s === "FIXO" || s === "ZERO") return s;

  if (safeNumber(interestRate, 0) <= 0) return "ZERO";
  return "PRO_RATA";
}

function normalizeTipo(v: any, jurosModo: JurosModoDB, interestRate: number): TipoDB {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "PARCELADO_COM_JUROS" || s === "PARCELADO_SEM_JUROS") return s;

  if (jurosModo !== "ZERO" && safeNumber(interestRate, 0) > 0) return "PARCELADO_COM_JUROS";
  return "PARCELADO_SEM_JUROS";
}

export const agreementService = {
  async createAgreement(
    loanId: string,
    agreementData: Omit<Agreement, "id" | "createdAt" | "status" | "installments">,
    installments: AgreementInstallment[],
    profileId: string
  ) {
    const agreementId = generateUUID();

    // --- Campos numéricos base (com fallback)
    const interestRate = safeNumber(
      (agreementData as any).interestRate ?? (agreementData as any).interest_rate,
      0
    );

    const negotiatedTotal = safeNumber(
      (agreementData as any).negotiatedTotal ??
        (agreementData as any).totalAmount ??
        (agreementData as any).total_amount,
      0
    );

    const totalBase = safeNumber(
      (agreementData as any).totalDebtAtNegotiation ??
        (agreementData as any).total_divida_base ??
        (agreementData as any).total_base,
      0
    );

    // --- Not null / checks
    const periodicidade = normalizePeriodicidade(
      (agreementData as any).frequency ?? (agreementData as any).periodicidade
    );

    const jurosModo = normalizeJurosModo((agreementData as any).juros_modo, interestRate);

    const tipo = normalizeTipo(
      (agreementData as any).type ?? (agreementData as any).tipo,
      jurosModo,
      interestRate
    );

    const numParcelas =
      Math.max(
        1,
        safeNumber(
          (agreementData as any).installmentsCount ??
            (agreementData as any).num_parcelas ??
            installments?.length,
          1
        )
      ) | 0;

    const firstDueDate =
      installments?.[0]?.dueDate
        ? toISODateOnly(installments[0].dueDate)
        : toISODateOnly(new Date(Date.now() + 24 * 60 * 60 * 1000));

    // total_amount não pode ficar 0 “por acidente”
    const totalAmount = negotiatedTotal > 0 ? negotiatedTotal : Math.max(0, totalBase);

    // ✅ valor_parcela é NOT NULL no banco -> NUNCA pode ser null
    // tenta pegar do payload, senão usa a primeira parcela, senão divide total/parcelas
    const valorParcela = safeNumber(
      (agreementData as any).valor_parcela ??
        (agreementData as any).valorParcela ??
        (agreementData as any).installmentValue ??
        installments?.[0]?.amount ??
        (numParcelas > 0 ? totalAmount / numParcelas : totalAmount),
      0
    );

    // coluna "installments" no seu banco está como INTEGER (pelo erro que você mostrou)
    const installmentsInt = numParcelas;

    // 1) Header
    const { error: headerError } = await supabase.from("acordos_inadimplencia").insert({
      id: agreementId,
      loan_id: loanId,
      profile_id: profileId,
      status: "ACTIVE",

      // ✅ CHECKs
      tipo, // PARCELADO_COM_JUROS | PARCELADO_SEM_JUROS
      periodicidade, // SEMANAL | QUINZENAL | MENSAL
      juros_modo: jurosModo, // PRO_RATA | FIXO | ZERO

      // ✅ NOT NULL
      num_parcelas: numParcelas,
      first_due_date: firstDueDate,
      total_amount: totalAmount,
      valor_parcela: valorParcela, // ✅ NUNCA NULL
      interest_rate: interestRate,
      installments: installmentsInt,

      // opcionais (se existirem no schema)
      total_negociado: negotiatedTotal,
      juros_mensal_percent: safeNumber((agreementData as any).juros_mensal_percent, 0),
      principal_base: safeNumber((agreementData as any).principal_base, 0),
      interest_base: safeNumber((agreementData as any).interest_base, 0),
      late_fee_base: safeNumber((agreementData as any).late_fee_base, 0),
      total_base: totalBase,
      notes: (agreementData as any).notes ?? null,
    });

    if (headerError) throw new Error("Erro ao criar acordo: " + headerError.message);

    // 2) Parcelas (acordo_parcelas)
    const installmentsPayload = (installments || []).map((inst) => ({
      id: generateUUID(),
      acordo_id: agreementId,
      profile_id: profileId,
      numero: (Math.max(1, safeNumber(inst.number, 1)) | 0),
      data_vencimento: toISODateOnly(inst.dueDate),
      valor: safeNumber(inst.amount, 0),
      status: "PENDING",
      valor_pago: 0,
    }));

    // se veio vazio, cria 1 parcela mínima (evita travar UI)
    if (installmentsPayload.length === 0) {
      installmentsPayload.push({
        id: generateUUID(),
        acordo_id: agreementId,
        profile_id: profileId,
        numero: 1,
        data_vencimento: firstDueDate,
        valor: valorParcela || totalAmount,
        status: "PENDING",
        valor_pago: 0,
      });
    }

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
    const ownerId = (user as any).supervisor_id || user.id;

    const newPaidAmount = safeNumber(installment.paidAmount, 0) + safeNumber(amount, 0);
    const installmentAmount = safeNumber(installment.amount, 0);
    const newStatus = newPaidAmount >= installmentAmount - 0.1 ? "PAID" : "PARTIAL";

    const { error: instError } = await supabase
      .from("acordo_parcelas")
      .update({
        valor_pago: newPaidAmount,
        status: newStatus,
        data_pagamento: new Date().toISOString(),
      })
      .eq("id", installment.id);

    if (instError) throw instError;

    const { error: payErr } = await supabase.from("acordo_pagamentos").insert({
      id: generateUUID(),
      parcela_id: installment.id,
      acordo_id: agreement.id,
      profile_id: ownerId,
      amount: safeNumber(amount, 0),
      date: new Date().toISOString(),
    });

    if (payErr) throw payErr;

    const { error: txErr } = await supabase.from("transacoes").insert({
      id: generateUUID(),
      loan_id: agreement.loanId,
      agreement_id: agreement.id,
      profile_id: ownerId,
      source_id: sourceId,
      date: new Date().toISOString(),
      type: "AGREEMENT_PAYMENT",
      amount: safeNumber(amount, 0),
      principal_delta: 0,
      interest_delta: 0,
      late_fee_delta: 0,
      category: "RECUPERACAO",
      notes: `Pagamento Acordo ${installment.number}/${agreement.installmentsCount}`,
    });

    if (txErr) throw txErr;

    const { error: balErr } = await supabase.rpc("adjust_source_balance", {
      p_source_id: safeUUID(sourceId),
      p_delta: safeNumber(amount, 0),
    });

    if (balErr) throw balErr;

    // Quitação total
    if (newStatus === "PAID") {
      const { count, error: countErr } = await supabase
        .from("acordo_parcelas")
        .select("*", { count: "exact", head: true })
        .eq("acordo_id", agreement.id)
        .neq("status", "PAID");

      if (countErr) throw countErr;

      if ((count || 0) === 0) {
        const { error: agErr } = await supabase
          .from("acordos_inadimplencia")
          .update({ status: "PAID" })
          .eq("id", agreement.id);

        if (agErr) throw agErr;

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