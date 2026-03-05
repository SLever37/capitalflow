
export const translateTransactionType = (type: string): string => {
  const translations: Record<string, string> = {
    'LEND_MORE': 'Novo Aporte',
    'PAYMENT_FULL': 'Quitação',
    'PAYMENT_PARTIAL': 'Pagamento Parcial',
    'PAYMENT': 'Pagamento',
    'RENEW_INTEREST': 'Renovação (Juros)',
    'RENEW_AV': 'Renovação com Aporte',
    'ADJUSTMENT': 'Ajuste',
    'ESTORNO': 'Estorno',
    'NOVO_APORTE': 'Novo Aporte',
    'AGREEMENT_PAYMENT': 'Pagamento de Acordo',
    'FULL': 'Quitação Total',
    'CUSTOM': 'Personalizado',
    'PARTIAL_INTEREST': 'Juros Parciais',
    'SYSTEM': 'Sistema',
    'AUDIT': 'Auditoria',
  };

  return translations[type] || type;
};

export const translateLoanStatus = (status: string): string => {
  const translations: Record<string, string> = {
    'PENDING': 'Pendente',
    'PAID': 'Quitado',
    'LATE': 'Atrasado',
    'PARTIAL': 'Parcial',
    'OVERDUE': 'Atrasado',
    'ACTIVE': 'Ativo',
    'BROKEN': 'Quebrado',
  };

  return translations[status] || status;
};

export const translateFilter = (filter: string): string => {
  const translations: Record<string, string> = {
    'TODOS': 'Todos',
    'ATRASADOS': 'Atrasados',
    'ATRASO_CRITICO': 'Atraso Crítico',
    'EM_DIA': 'Em Dia',
    'PAGOS': 'Pagos',
    'ARQUIVADOS': 'Arquivados',
  };

  return translations[filter] || filter;
};
