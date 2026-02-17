
import { supabase } from '../lib/supabase';
import type { Loan, Installment, UserProfile, CapitalSource } from '../types';
import { allocatePayment } from '../domain/finance/calculations';
import { todayDateOnlyUTC, getDaysDiff } from '../utils/dateHelpers';
import { financeDispatcher } from '../domain/finance/dispatch';
import { generateUUID } from '../utils/generators';

/* =========================
   Helpers
========================= */
const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeUUID = (v: any) => (isUUID(v) ? v : null);

export const paymentsService = {
  async processPayment(params: {
    loan: Loan;
    inst: Installment;
    calculations: any;
    paymentType: 'FULL' | 'RENEW_INTEREST' | 'RENEW_AV' | 'LEND_MORE' | 'CUSTOM' | 'PARTIAL_INTEREST';
    avAmount: string;
    activeUser: UserProfile;
    sources: CapitalSource[];
    forgivenessMode?: 'NONE' | 'FINE_ONLY' | 'INTEREST_ONLY' | 'BOTH';
    manualDate?: Date | null; // Data de VENCIMENTO FUTURO
    customAmount?: number;
    realDate?: Date | null;   // Data REAL do PAGAMENTO (Extrato)
    interestHandling?: 'CAPITALIZE' | 'KEEP_PENDING';
  }) {
    const {
      loan,
      inst,
      calculations,
      paymentType,
      avAmount,
      activeUser,
      sources,
      forgivenessMode = 'NONE',
      manualDate,
      customAmount,
      realDate,
      interestHandling
    } = params;

    // =========================
    // DEMO MODE
    // =========================
    if (activeUser.id === 'DEMO') {
      return { amountToPay: customAmount || Number(calculations?.total) || 0, paymentType };
    }

    // =========================
    // OWNER PADRÃO (CRÍTICO)
    // =========================
    const ownerId =
      safeUUID((activeUser as any).supervisor_id) ||
      safeUUID(activeUser.id);

    if (!ownerId) {
      throw new Error('Perfil inválido. Refaça o login.');
    }

    const idempotencyKey = generateUUID();

    // =========================
    // NOVO APORTE (LEND_MORE)
    // =========================
    if (paymentType === 'LEND_MORE') {
      const lendAmount = parseFloat(avAmount) || 0;
      if (lendAmount <= 0) throw new Error('Valor do aporte inválido.');

      const { error } = await supabase.rpc('process_lend_more_atomic', {
        p_idempotency_key: idempotencyKey,
        p_loan_id: loan.id,
        p_installment_id: inst.id,
        p_profile_id: ownerId,
        p_operator_id: safeUUID(activeUser.id),
        p_source_id: loan.sourceId,
        p_amount: lendAmount,
        p_notes: `Novo Aporte (+ R$ ${lendAmount.toFixed(2)})`,
        p_new_total_principal: loan.principal + lendAmount,
        p_new_total_to_receive: loan.totalToReceive + lendAmount,
        p_inst_principal_rem: (Number(inst.principalRemaining) || 0) + lendAmount,
        p_inst_scheduled_princ: (Number(inst.scheduledPrincipal) || 0) + lendAmount,
        p_inst_amount: (Number(inst.amount) || 0) + lendAmount,
        p_category: 'INVESTIMENTO'
      });

      if (error) throw new Error('Erro ao processar aporte: ' + error.message);
      return { amountToPay: lendAmount, paymentType };
    }

    // =========================
    // CÁLCULO DE PERDÃO GRANULAR
    // =========================
    // Reconstrói os valores de multa e mora individualmente para aplicar o perdão
    const daysLate = Math.max(0, getDaysDiff(inst.dueDate));
    const baseForFine = (calculations.principal || 0) + (calculations.interest || 0);
    
    let fineFixed = 0;
    let fineDaily = 0;

    if (daysLate > 0) {
        fineFixed = baseForFine * (loan.finePercent / 100);
        fineDaily = baseForFine * (loan.dailyInterestPercent / 100) * daysLate;
    }

    let finalLateFee = fineFixed + fineDaily;

    if (forgivenessMode === 'FINE_ONLY') {
        finalLateFee -= fineFixed; // Remove fixa, mantém diária
    } else if (forgivenessMode === 'INTEREST_ONLY') {
        finalLateFee -= fineDaily; // Remove diária, mantém fixa
    } else if (forgivenessMode === 'BOTH') {
        finalLateFee = 0; // Remove tudo
    }
    
    // Arredonda
    finalLateFee = Math.round((finalLateFee + Number.EPSILON) * 100) / 100;
    
    // Novo total recalculado
    const finalTotal = (calculations.principal || 0) + (calculations.interest || 0) + finalLateFee;

    const calculationBase = {
        ...calculations,
        lateFee: finalLateFee,
        total: finalTotal
    };

    // =========================
    // ALOCAÇÃO DE PAGAMENTO
    // =========================
    let amountToPay = 0;
    let basePaymentNote = '';
    let allocation: any = null;

    if (paymentType === 'CUSTOM') {
      amountToPay = customAmount || 0;
      allocation = { principalPaid: 0, interestPaid: amountToPay, lateFeePaid: 0, avGenerated: 0 };
      basePaymentNote = `Recebimento de Diária(s)`;

    } else if (paymentType === 'RENEW_AV') {
      amountToPay = parseFloat(avAmount) || 0;
      allocation = { principalPaid: 0, interestPaid: 0, lateFeePaid: 0, avGenerated: amountToPay };
      basePaymentNote = `Amortização de Capital`;

    } else if (paymentType === 'FULL') {
      amountToPay = Number(calculationBase.total);
      basePaymentNote = 'Quitação Total do Contrato';
      allocation = allocatePayment(amountToPay, calculationBase);

    } else if (paymentType === 'PARTIAL_INTEREST') {
      amountToPay = parseFloat(avAmount) || 0;
      allocation = allocatePayment(amountToPay, calculationBase);
      basePaymentNote = 'Pagamento Parcial';

    } else {
      const interestOnly = Number(calculationBase?.interest) || 0;
      const lateFee = Number(calculationBase?.lateFee) || 0;
      
      amountToPay = interestOnly + lateFee;
      basePaymentNote = 'Pagamento de Juros / Renovação';
      
      allocation = allocatePayment(amountToPay, calculationBase);
    }

    if (amountToPay <= 0) {
      throw new Error('O valor do pagamento deve ser maior que zero.');
    }

    // =========================
    // CÁLCULOS FINANCEIROS & REGRAS AVANÇADAS
    // =========================
    const paymentDate = realDate || todayDateOnlyUTC();
    const paymentDateISO = paymentDate.toISOString();

    const renewal = financeDispatcher.renew(
      loan,
      inst,
      amountToPay,
      allocation,
      paymentDate,
      forgivenessMode === 'BOTH', // Mantém compatibilidade com bool para estratégias simples
      manualDate
    );

    // 3. Regra de Pagamento Parcial de Juros (Pós-Dispatcher)
    if (paymentType !== 'FULL') {
        const totalInterestExpected = (Number(calculations.interest) || 0) + finalLateFee;
        const totalInterestPaid = (allocation.interestPaid || 0) + (allocation.lateFeePaid || 0);
        
        const unpaidInterest = Math.max(0, totalInterestExpected - totalInterestPaid);

        if (unpaidInterest > 0.05) { 
            if (interestHandling === 'CAPITALIZE') {
                renewal.newPrincipalRemaining += unpaidInterest;
                renewal.newScheduledPrincipal += unpaidInterest;
                renewal.newInterestRemaining = 0; 
                basePaymentNote += ` (Juros de R$ ${unpaidInterest.toFixed(2)} Capitalizados)`;
            } else if (interestHandling === 'KEEP_PENDING') {
                renewal.newInterestRemaining += unpaidInterest;
                basePaymentNote += ` (Restam R$ ${unpaidInterest.toFixed(2)} de Juros)`;
            }
        }
    }

    // 4. Montagem da Nota de Auditoria
    const formattedDate = paymentDate.toLocaleDateString('pt-BR');
    let finalNote = `${basePaymentNote}. Ref: ${formattedDate}.`;
    
    if (forgivenessMode !== 'NONE') {
        finalNote += ` [Perdão: ${forgivenessMode === 'FINE_ONLY' ? 'Multa' : forgivenessMode === 'INTEREST_ONLY' ? 'Mora' : 'Total'}]`;
    }

    // =========================
    // PERSISTÊNCIA (RPC ATÔMICA)
    // =========================
    const profitGenerated = (Number(allocation?.interestPaid) || 0) + (Number(allocation?.lateFeePaid) || 0);
    const principalReturned = (Number(allocation?.principalPaid) || 0) + (Number(allocation?.avGenerated) || 0);

    const { error } = await supabase.rpc('process_payment_atomic', {
      p_idempotency_key: idempotencyKey,
      p_loan_id: loan.id,
      p_installment_id: inst.id,
      p_profile_id: ownerId,
      p_operator_id: safeUUID(activeUser.id),
      p_source_id: loan.sourceId,
      p_payment_type: paymentType === 'FULL' ? 'PAYMENT_FULL' : 'PAYMENT_PARTIAL',
      p_amount_to_pay: amountToPay,
      p_profit_generated: profitGenerated,
      p_principal_returned: principalReturned,
      p_principal_delta: principalReturned,
      p_interest_delta: Number(allocation?.interestPaid) || 0,
      p_late_fee_delta: Number(allocation?.lateFeePaid) || 0,
      p_notes: finalNote,
      // Passa os novos estados calculados (já com as regras aplicadas)
      p_new_start_date: renewal.newStartDateISO,
      p_new_due_date: renewal.newDueDateISO,
      p_new_principal_remaining: renewal.newPrincipalRemaining,
      p_new_interest_remaining: renewal.newInterestRemaining,
      p_new_scheduled_principal: renewal.newScheduledPrincipal,
      p_new_scheduled_interest: renewal.newScheduledInterest,
      p_new_amount: renewal.newAmount,
      p_category: 'RECEITA'
    });

    if (realDate && !isSameDay(realDate, new Date())) {
        setTimeout(async () => {
             await supabase.from('transacoes')
                .update({ date: paymentDateISO })
                .eq('loan_id', loan.id)
                .order('created_at', { ascending: false })
                .limit(1);
        }, 500);
    }

    if (error) {
      throw new Error('Falha na persistência de dados: ' + error.message);
    }

    return { amountToPay, paymentType };
  }
};

// Helper simples
function isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}
