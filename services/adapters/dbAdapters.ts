import { Loan, LoanStatus, Agreement, AgreementStatus } from '../../types';
import { maskPhone } from '../../utils/formatters';
import { asArray, asNumber, asString, safeDateString } from '../../utils/safe';

export const agreementAdapter = (raw: any): Agreement => {
  if (!raw) throw new Error('Dados do acordo inválidos');

  const dbStatus = asString(raw.status).trim().toUpperCase();

  let normalizedStatus: AgreementStatus = 'ACTIVE';
  if (['PAGO', 'PAID', 'QUITADO', 'QUITADA'].includes(dbStatus)) normalizedStatus = 'PAID';
  else if (['BROKEN', 'QUEBRADO', 'CANCELADO', 'INATIVO'].includes(dbStatus)) normalizedStatus = 'BROKEN';

  const installments = asArray(raw.acordo_parcelas).map((p: any) => ({
    id: asString(p.id),
    agreementId: asString(raw.id),
    number: asNumber(p.numero),
    dueDate: safeDateString(p.due_date || p.data_vencimento),
    amount: asNumber(p.amount || p.valor),
    status: ['PAGO', 'PAID'].includes(String(p.status).toUpperCase()) ? 'PAID' : 'PENDING',
    paidAmount: asNumber(p.paid_amount || p.valor_pago),
    paidDate: p.paid_at || p.data_pagamento
  }));

  return {
    id: asString(raw.id),
    loanId: asString(raw.loan_id),
    type: raw.tipo,
    totalDebtAtNegotiation: asNumber(raw.total_base),
    negotiatedTotal: asNumber(raw.total_negociado),
    interestRate: asNumber(raw.juros_mensal_percent),
    installmentsCount: installments.length,
    frequency: asString(raw.periodicidade),
    startDate: safeDateString(raw.created_at),
    status: normalizedStatus,
    createdAt: safeDateString(raw.created_at),
    installments
  };
};

export const mapLoanFromDB = (l: any, clientsData: any[] = []): Loan => {
  const rawParcelas = asArray(l.parcelas);

  const installments = rawParcelas.map((p: any) => {
    const rawStatus = asString(p.status, 'PENDING').toUpperCase();

    let status: LoanStatus = LoanStatus.PENDING;

    if (['PAGO', 'PAID'].includes(rawStatus)) status = LoanStatus.PAID;
    else if (['PARCIAL', 'PARTIAL'].includes(rawStatus)) status = LoanStatus.PARTIAL;
    else if (['LATE', 'ATRASADO'].includes(rawStatus)) status = LoanStatus.LATE;

    return {
      id: asString(p.id),
      dueDate: safeDateString(p.data_vencimento || p.due_date),
      amount: asNumber(p.valor_parcela || p.amount),
      principalRemaining: asNumber(p.principal_remaining),
      interestRemaining: asNumber(p.interest_remaining),
      lateFeeAccrued: asNumber(p.late_fee_accrued),
      status,
      logs: []
    };
  });

  return {
    id: asString(l.id),
    profile_id: asString(l.profile_id),
    clientId: asString(l.client_id),
    owner_id: asString(l.owner_id),
    debtorName: asString(l.debtor_name),
    debtorPhone: maskPhone(asString(l.debtor_phone || '')),
    principal: asNumber(l.principal),
    interestRate: asNumber(l.interest_rate),
    startDate: safeDateString(l.start_date),
    createdAt: safeDateString(l.created_at),
    status: LoanStatus.PENDING,
    installments,
    ledger: [],
    paymentSignals: [],
    attachments: [],
    documentPhotos: [],
    activeAgreement: undefined
  };
};