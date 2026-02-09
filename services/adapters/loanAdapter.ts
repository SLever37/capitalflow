
import { Loan, LoanStatus, Agreement, AgreementStatus } from '../../types';
import { maskPhone } from '../../utils/formatters';
import { asArray, asNumber, asString, safeDateString } from '../../utils/safe';

// --- ADAPTER JURÍDICO (BANCO -> FRONTEND) ---
export const agreementAdapter = (raw: any): Agreement => {
    if (!raw) throw new Error("Dados do acordo inválidos");

    const dbStatus = asString(raw.status, '', 'status').toUpperCase();
    let normalizedStatus: AgreementStatus = 'ACTIVE';

    if (['PAGO', 'PAID', 'QUITADO'].includes(dbStatus)) normalizedStatus = 'PAID';
    else if (['BROKEN', 'QUEBRADO', 'CANCELADO', 'INATIVO'].includes(dbStatus)) normalizedStatus = 'BROKEN';
    else if (['ATIVO', 'ACTIVE'].includes(dbStatus)) normalizedStatus = 'ACTIVE';
    else normalizedStatus = 'ACTIVE';

    const installments = asArray(raw.acordo_parcelas).map((p: any) => ({
        id: asString(p.id, `tmp-${Math.random()}`),
        agreementId: asString(raw.id, '', 'agreement.id'),
        number: asNumber(p.numero),
        dueDate: safeDateString(p.due_date || p.data_vencimento, 'dueDate'),
        amount: asNumber(p.amount || p.valor),
        status: (['PAGO', 'PAID'].includes(asString(p.status).toUpperCase())) ? 'PAID' : asString(p.status || 'PENDING').toUpperCase(),
        paidAmount: asNumber(p.paid_amount || p.valor_pago),
        paidDate: p.paid_at || p.data_pagamento
    })).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()); // Garante ordem cronológica

    return {
        id: asString(raw.id, '', 'agreement.id'),
        loanId: asString(raw.loan_id, '', 'loanId'),
        type: (raw.tipo || 'PARCELADO_COM_JUROS') as any,
        totalDebtAtNegotiation: asNumber(raw.total_base),
        negotiatedTotal: asNumber(raw.total_negociado),
        interestRate: asNumber(raw.juros_mensal_percent),
        installmentsCount: asNumber(raw.num_parcelas) || installments.length,
        frequency: asString(raw.periodicidade, 'MONTHLY'),
        startDate: safeDateString(raw.created_at),
        status: normalizedStatus,
        createdAt: safeDateString(raw.created_at),
        installments: installments
    } as Agreement;
};

// --- ADAPTER CONTRATO (BANCO -> FRONTEND) ---
export const mapLoanFromDB = (l: any, clientsData: any[] = []): Loan => {
    const rawParcelas = asArray(l.parcelas);
    const rawTransacoes = asArray(l.transacoes);
    const rawSinais = asArray(l.sinalizacoes_pagamento);

    // CORREÇÃO CRÍTICA: Ordenação por Data de Vencimento
    // Garante que o Portal pegue a parcela mais antiga pendente, e não uma futura aleatória (ex: 2026)
    const installments = rawParcelas.map((p: any) => ({
        id: asString(p.id),
        dueDate: safeDateString(p.data_vencimento || p.due_date, 'dueDate'),
        amount: asNumber(p.valor_parcela || p.amount),
        scheduledPrincipal: asNumber(p.scheduled_principal),
        scheduledInterest: asNumber(p.scheduled_interest),
        principalRemaining: asNumber(p.principal_remaining),
        interestRemaining: asNumber(p.interest_remaining),
        lateFeeAccrued: asNumber(p.late_fee_accrued),
        avApplied: asNumber(p.av_applied),
        paidPrincipal: asNumber(p.paid_principal),
        paidInterest: asNumber(p.paid_interest),
        paidLateFee: asNumber(p.paid_late_fee),
        paidTotal: asNumber(p.paid_total),
        status: asString(p.status, 'PENDING') as LoanStatus,
        paidDate: p.paid_date,
        number: asNumber(p.numero_parcela || p.number), // Garante número da parcela
        logs: []
    })).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const ledger = rawTransacoes.map((t: any) => ({
        id: asString(t.id),
        date: safeDateString(t.date),
        type: asString(t.type, 'UNKNOWN') as any,
        amount: asNumber(t.amount),
        principalDelta: asNumber(t.principal_delta),
        interestDelta: asNumber(t.interest_delta),
        lateFeeDelta: asNumber(t.late_fee_delta),
        sourceId: t.source_id,
        installmentId: t.installment_id,
        agreementId: t.agreement_id,
        notes: asString(t.notes),
        category: asString(t.category) as any
    }));

    const signals = rawSinais.map((s: any) => ({
        id: asString(s.id),
        date: safeDateString(s.created_at),
        type: s.tipo_intencao,
        status: s.status,
        comprovanteUrl: s.comprovante_url,
        clientViewedAt: s.client_viewed_at,
        reviewNote: s.review_note
    }));

    let activeAgreement = undefined;
    const agreementsArr = asArray(l.acordos_inadimplencia);
    if (agreementsArr.length > 0) {
        const rawAgreement = agreementsArr.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        try {
            if (rawAgreement) activeAgreement = agreementAdapter(rawAgreement);
        } catch (e) {
            console.warn("Falha ao mapear acordo", l.id, e);
        }
    }

    let phone = l.debtor_phone || l.phone || l.telefone || l.celular;
    let debtorClientNumber = null;

    // Busca dados enriquecidos do cliente (Número/Código) se disponível na lista carregada
    if (l.client_id && asArray(clientsData).length > 0) {
        const linkedClient = clientsData.find((c: any) => c.id === l.client_id);
        if (linkedClient) {
            // Se não tinha telefone no contrato, pega do cliente
            if (!phone || String(phone).trim() === '') {
                phone = linkedClient.phone || linkedClient.telefone || linkedClient.celular;
            }
            // Pega o número do cliente (Código) para agrupamento correto
            debtorClientNumber = linkedClient.client_number || linkedClient.clientNumber;
        }
    }
    
    return {
        id: asString(l.id, '', 'id'),
        clientId: asString(l.client_id),
        profile_id: asString(l.profile_id), 
        debtorName: asString(l.debtor_name, 'Cliente Desconhecido'),
        debtorPhone: maskPhone(asString(phone, '00000000000')),
        debtorDocument: l.debtor_document,
        debtorClientNumber, // Propriedade injetada para agrupamento por código
        debtorAddress: l.debtor_address,
        clientAvatarUrl: l.cliente_foto_url,
        sourceId: asString(l.source_id),
        preferredPaymentMethod: asString(l.preferred_payment_method, 'PIX') as any,
        pixKey: l.pix_key,
        principal: asNumber(l.principal),
        interestRate: asNumber(l.interest_rate),
        finePercent: asNumber(l.fine_percent),
        dailyInterestPercent: asNumber(l.daily_interest_percent),
        
        // Mapeamento de Funding
        fundingTotalPayable: asNumber(l.funding_total_payable),
        fundingCost: asNumber(l.funding_cost),
        fundingProvider: asString(l.funding_provider),
        fundingFeePercent: asNumber(l.funding_fee_percent),

        billingCycle: asString(l.billing_cycle, 'MONTHLY') as any,
        amortizationType: asString(l.amortization_type, 'JUROS') as any,
        startDate: safeDateString(l.start_date),
        createdAt: safeDateString(l.created_at), 
        totalToReceive: asNumber(l.total_to_receive),
        notes: asString(l.notes),
        guaranteeDescription: asString(l.guarantee_description),
        policiesSnapshot: l.policies_snapshot || null,
        installments,
        ledger,
        paymentSignals: signals,
        customDocuments: asArray(l.policies_snapshot?.customDocuments),
        isArchived: !!l.is_archived,
        attachments: [], 
        documentPhotos: [],
        activeAgreement
    } as Loan;
};
