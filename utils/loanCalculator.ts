/**
 * CALCULADORA UNIFICADA DE EMPRÉSTIMO
 * Usada por: Simulador + payments.service.ts
 * Garante consistência de cálculo em todo o sistema
 */

export interface LoanCalculationInput {
  principal: number;
  dailyRate: number; // Taxa diária (ex: 0.05 para 5% ao dia)
  startDate: Date;
  dueDate: Date;
  lateFeeFixed?: number; // Multa fixa (ex: 50)
  lateFeeDaily?: number; // Mora diária (ex: 0.02 para 2% ao dia)
  forgiveness?: 'FINE_ONLY' | 'INTEREST_ONLY' | 'BOTH' | 'NONE';
  currentDate?: Date; // Data de cálculo (default: hoje)
}

export interface LoanCalculationOutput {
  principal: number;
  interest: number;
  lateFee: number;
  total: number;
  daysElapsed: number;
  isDueToday: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  breakdown: {
    principal: number;
    interest: number;
    lateFee: number;
  };
  nextDueDate?: Date;
}

export interface SimulatorInput extends LoanCalculationInput {
  paymentAmount?: number;
  paymentType?: 'PARTIAL' | 'FULL' | 'RENEWAL';
}

export interface SimulatorOutput extends LoanCalculationOutput {
  paymentAmount?: number;
  remainingAfterPayment?: number;
  nextInstallmentDate?: Date;
}

// Calcular dias entre datas
function getDaysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Calcular juros do período
function calculateInterest(
  principal: number,
  dailyRate: number,
  daysElapsed: number
): number {
  return principal * dailyRate * daysElapsed;
}

// Calcular multa por atraso
function calculateLateFee(
  principal: number,
  daysOverdue: number,
  lateFeeFixed: number = 0,
  lateFeeDaily: number = 0
): number {
  if (daysOverdue <= 0) return 0;

  const fixedPart = lateFeeFixed;
  const dailyPart = principal * lateFeeDaily * daysOverdue;
  return fixedPart + dailyPart;
}

// Aplicar perdão (FINE_ONLY / INTEREST_ONLY / BOTH)
function applyForgiveness(
  interest: number,
  lateFee: number,
  forgiveness?: string
): { interest: number; lateFee: number } {
  if (!forgiveness || forgiveness === 'NONE') {
    return { interest, lateFee };
  }

  if (forgiveness === 'FINE_ONLY') {
    return { interest, lateFee: 0 };
  }

  if (forgiveness === 'INTEREST_ONLY') {
    return { interest: 0, lateFee };
  }

  if (forgiveness === 'BOTH') {
    return { interest: 0, lateFee: 0 };
  }

  return { interest, lateFee };
}

// FUNÇÃO PRINCIPAL: Calcular empréstimo
export function calculateLoan(input: LoanCalculationInput): LoanCalculationOutput {
  const {
    principal,
    dailyRate,
    startDate,
    dueDate,
    lateFeeFixed = 0,
    lateFeeDaily = 0,
    forgiveness = 'NONE',
    currentDate = new Date(),
  } = input;

  // Validações
  if (principal <= 0) throw new Error('Principal deve ser > 0');
  if (dailyRate < 0) throw new Error('Taxa diária nao pode ser negativa');
  if (startDate >= dueDate) throw new Error('Data de inicio deve ser antes da data de vencimento');

  // Calcular dias
  const daysElapsed = getDaysBetween(startDate, currentDate);
  const daysToExpiry = getDaysBetween(currentDate, dueDate);
  const daysOverdue = Math.max(0, -daysToExpiry);
  const isDueToday = daysToExpiry === 0;
  const isOverdue = daysOverdue > 0;

  // Calcular juros
  let interest = calculateInterest(principal, dailyRate, daysElapsed);

  // Calcular multa
  let lateFee = calculateLateFee(principal, daysOverdue, lateFeeFixed, lateFeeDaily);

  // Aplicar perdão
  const forgiven = applyForgiveness(interest, lateFee, forgiveness);
  interest = forgiven.interest;
  lateFee = forgiven.lateFee;

  // Total
  const total = principal + interest + lateFee;

  // Próximo vencimento (se renovar)
  const nextDueDate = new Date(dueDate);
  nextDueDate.setDate(nextDueDate.getDate() + 30); // +30 dias por padrão

  return {
    principal,
    interest: Math.round(interest * 100) / 100,
    lateFee: Math.round(lateFee * 100) / 100,
    total: Math.round(total * 100) / 100,
    daysElapsed,
    isDueToday,
    isOverdue,
    daysOverdue,
    breakdown: {
      principal,
      interest: Math.round(interest * 100) / 100,
      lateFee: Math.round(lateFee * 100) / 100,
    },
    nextDueDate,
  };
}

// SIMULADOR: Projetar pagamento
export function simulatePayment(input: SimulatorInput): SimulatorOutput {
  const { paymentAmount = 0, paymentType = 'PARTIAL', ...calculationInput } = input;

  // Calcular valores atuais
  const current = calculateLoan(calculationInput);

  // Aplicar pagamento (late_fee → interest → principal)
  let remaining = paymentAmount;
  let paidLateFee = Math.min(remaining, current.lateFee);
  remaining -= paidLateFee;

  let paidInterest = Math.min(remaining, current.interest);
  remaining -= paidInterest;

  let paidPrincipal = Math.min(remaining, current.principal);
  remaining -= paidPrincipal;

  // Calcular saldo
  const remainingAfterPayment = current.total - paymentAmount;

  // Próxima data de vencimento
  let nextInstallmentDate: Date | undefined;
  if (paymentType === 'FULL' && remainingAfterPayment <= 0) {
    // Quitação: sem próximo vencimento
    nextInstallmentDate = undefined;
  } else if (paymentType === 'RENEWAL') {
    // Renovação: +30 dias
    nextInstallmentDate = new Date(calculationInput.dueDate);
    nextInstallmentDate.setDate(nextInstallmentDate.getDate() + 30);
  } else {
    // Parcial: mesmo vencimento
    nextInstallmentDate = calculationInput.dueDate;
  }

  return {
    ...current,
    paymentAmount,
    remainingAfterPayment: Math.max(0, remainingAfterPayment),
    nextInstallmentDate,
  };
}

// HELPER: Formatar para exibição
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// HELPER: Formatar data
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date);
}
