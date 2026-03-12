// /app/applet/features/agreements/services/agreementService.ts
import { supabase } from "../../../lib/supabase";
import { Agreement, AgreementInstallment, UserProfile } from "../../../types";
import { generateUUID } from "../../../utils/generators";
import { safeUUID } from "../../../utils/uuid";

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

    const interestRate = safeNumber(
      (agreementData as any).interestRate ??
      (agreementData as any).interest_rate,
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

    const periodicidade = normalizePeriodicidade(
      (agreementData as any).frequency ??
      (agreementData as any).periodicidade
    );

    const jurosModo = normalizeJurosModo(
      (agreementData as any).juros_modo,
      interestRate
    );

    const tipo = normalizeTipo(
      (agreementData as any).type ??
      (agreementData as any).tipo,
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
        : toISODateOnly(new Date(Date.now() + 86400000));

    const totalAmount =
      negotiatedTotal > 0
        ? negotiatedTotal
        : Math.max(0, totalBase);

    const valorParcela = safeNumber(
      (agreementData as any).valor_parcela ??
      (agreementData as any).valorParcela ??
      (agreementData as any).installmentValue ??
      installments?.[0]?.amount ??
      (numParcelas > 0 ? totalAmount / numParcelas : totalAmount),
      0
    );

    const installmentsInt = numParcelas;

    const calculationMode =
      (agreementData as any).calculationMode ??
      (agreementData as any).calculation_mode ??
      "BY_INSTALLMENTS";

    const installmentValue = safeNumber(
      (agreementData as any).installmentValue ??
      (agreementData as any).installment_value,
      0
    );

    const calculationResult =
      (agreementData as any).calculationResult ??
      (agreementData as any).calculation_result ??
      null;

    const { error: headerError } =
      await supabase.from("acordos_inadimplencia").insert({

        id: agreementId,
        loan_id: loanId,
        profile_id: profileId,
        status: "ATIVO",

        tipo,
        periodicidade,
        juros_modo: jurosModo,

        num_parcelas: numParcelas,
        first_due_date: firstDueDate,

        total_amount: totalAmount,
        valor_parcela: valorParcela,
        interest_rate: interestRate,
        installments: installmentsInt,

        total_negociado: negotiatedTotal,
        total_base: totalBase,

        juros_mensal_percent: safeNumber((agreementData as any).juros_mensal_percent, 0),
        principal_base: safeNumber((agreementData as any).principal_base, 0),
        interest_base: safeNumber((agreementData as any).interest_base, 0),
        late_fee_base: safeNumber((agreementData as any).late_fee_base, 0),

        notes: (agreementData as any).notes ?? null,

        grace_period: safeNumber((agreementData as any).gracePeriod, 0),
        discount: safeNumber((agreementData as any).discount, 0),
        down_payment: safeNumber((agreementData as any).downPayment, 0),

        calculation_mode: calculationMode,
        installment_value: installmentValue,
        calculation_result: calculationResult,
        legal_document_id: (agreementData as any).legalDocumentId ?? null
      });

    if (headerError)
      throw new Error("Erro ao criar acordo: " + headerError.message);

    const installmentsPayload = (installments || []).map((inst) => ({
      id: generateUUID(),
      acordo_id: agreementId,
      profile_id: profileId,
      numero: Math.max(1, safeNumber(inst.number, 1)) | 0,
      due_date: toISODateOnly(inst.dueDate),
      valor: safeNumber(inst.amount, 0),
      status: "PENDENTE",
      valor_pago: 0
    }));

    if (installmentsPayload.length === 0) {
      installmentsPayload.push({
        id: generateUUID(),
        acordo_id: agreementId,
        profile_id: profileId,
        numero: 1,
        due_date: firstDueDate,
        valor: valorParcela || totalAmount,
        status: "PENDENTE",
        valor_pago: 0
      });
    }

    const { error: instError } =
      await supabase.from("acordo_parcelas").insert(installmentsPayload);

    if (instError)
      throw new Error("Erro ao gerar parcelas do acordo: " + instError.message);

    // ============================================================================
    // ETAPA 4: NOVA LÓGICA DE VÍNCULO AO CONTRATO (SEM ARQUIVAR, MANTENDO HISTÓRICO)
    // ============================================================================

    // 1. Atualiza o status do contrato para EM_ACORDO (mantém o contrato aberto e visível)
    await supabase.from("contratos").update({ 
      status: "EM_ACORDO" 
      // is_archived NÃO é alterado, o contrato continua ativo na visão do sistema
    }).eq("id", loanId);

    // 2. Congela as parcelas originais que estavam pendentes/atrasadas
    // Elas não são apagadas, apenas mudam de status para diferenciar das parcelas do acordo
    await supabase.from("parcelas").update({ 
      status: "RENEGOCIADO" 
    }).eq("loan_id", loanId).in("status", ["PENDENTE", "ATRASADO", "PENDING", "LATE"]);

    // 3. Registra o evento de renegociação no extrato (ledger) do contrato principal
    await supabase.from("transacoes").insert({
      id: generateUUID(),
      loan_id: loanId,
      profile_id: profileId,
      date: new Date().toISOString(),
      type: "RENEGOTIATION_CREATED",
      amount: 0, // Renegociação não é entrada de caixa
      notes: `Contrato renegociado em ${numParcelas}x de R$ ${valorParcela.toFixed(2)}. Acordo vinculado.`
    });

    return agreementId;
  },

  async breakAgreement(agreementId: string) {
    if (!agreementId) throw new Error("ID do acordo não fornecido.");
    
    // Busca os dados do acordo para saber qual contrato reverter
    const { data: agreement, error: fetchError } = await supabase
      .from("acordos_inadimplencia")
      .select("loan_id, profile_id")
      .eq("id", agreementId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // 1. Marca o acordo como quebrado
    const { error: updateError } = await supabase
      .from("acordos_inadimplencia")
      .update({ status: "QUEBRADO" })
      .eq("id", agreementId);

    if (updateError) throw updateError;

    if (agreement) {
      // 2. Retorna o contrato principal para o status ATIVO
      await supabase.from("contratos").update({ 
        status: "ATIVO",
        acordo_ativo_id: null
      }).eq("id", agreement.loan_id);

      // 3. Descongela as parcelas originais para que voltem a ser cobradas como PENDENTE
      await supabase.from("parcelas").update({ 
        status: "PENDENTE" 
      }).eq("loan_id", agreement.loan_id).eq("status", "RENEGOCIADO");

      // 4. Registra a quebra no histórico do contrato
      await supabase.from("transacoes").insert({
        id: generateUUID(),
        loan_id: agreement.loan_id,
        profile_id: agreement.profile_id,
        date: new Date().toISOString(),
        type: "RENEGOTIATION_BROKEN",
        amount: 0,
        notes: `Quebra de acordo. O contrato retornou ao fluxo normal de cobrança.`
      });
    }
  },

  async activateAgreement(agreementId: string) {
    if (!agreementId) throw new Error("ID do acordo não fornecido.");

    // Busca os dados do acordo para saber qual contrato reverter
    const { data: agreement, error: fetchError } = await supabase
      .from("acordos_inadimplencia")
      .select("loan_id, profile_id")
      .eq("id", agreementId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // 1. Marca o acordo como ATIVO
    const { error: updateError } = await supabase
      .from("acordos_inadimplencia")
      .update({ status: "ATIVO" })
      .eq("id", agreementId);

    if (updateError) throw updateError;

    if (agreement) {
      // 2. Garante que o contrato principal esteja em status EM_ACORDO
      await supabase.from("contratos").update({ 
        status: "EM_ACORDO",
        acordo_ativo_id: agreementId
      }).eq("id", agreement.loan_id);

      // 3. Garante que as parcelas originais estejam como RENEGOCIADO
      await supabase.from("parcelas").update({ 
        status: "RENEGOCIADO" 
      }).eq("loan_id", agreement.loan_id).in("status", ["PENDENTE", "ATRASADO", "PENDING", "LATE", "PAID", "PAGO"]);

      // 4. Reativa as parcelas do acordo que estavam pagas
      await supabase.from("acordo_parcelas").update({
        status: "PENDING",
        valor_pago: 0
      }).eq("acordo_id", agreementId).in("status", ["PAGO", "PAID", "QUITADO", "FINALIZADO"]);

      // 5. Registra a reativação no histórico
      await supabase.from("transacoes").insert({
        id: generateUUID(),
        loan_id: agreement.loan_id,
        profile_id: agreement.profile_id,
        date: new Date().toISOString(),
        type: "RENEGOTIATION_CREATED",
        amount: 0,
        notes: `Acordo reativado manualmente pelo administrador.`
      });
    }
  },

  async processPayment(agreement: any, installment: any, amount: number, sourceId: string, activeUser: any) {
    // 1. Atualiza a parcela específica do acordo
    const { error } = await supabase
      .from('acordo_parcelas')
      .update({
        status: 'PAGO',
        valor_pago: amount,
        data_pagamento: new Date().toISOString()
      })
      .eq('id', installment.id);

    if (error) throw error;

    // 2. Registra o pagamento no extrato (ledger) do contrato principal
    const loanId = agreement.loanId || agreement.loan_id;
    if (loanId) {
      await supabase.from('transacoes').insert({
        id: generateUUID(),
        loan_id: loanId,
        profile_id: activeUser.id,
        date: new Date().toISOString(),
        type: 'AGREEMENT_PAYMENT',
        amount: amount, // Aqui sim existe entrada real de caixa
        source_id: sourceId,
        notes: `Pagamento da parcela ${installment.numero || installment.number} do acordo de renegociação.`
      });
    }
  }

};