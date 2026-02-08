
import { Loan, Installment } from '../../../types';
import { calculateTotalDue } from '../../../domain/finance/calculations';
import { normalizeLoanForCalc, normalizeInstallmentForCalc } from './portalAdapters';
import { getDaysDiff } from '../../../utils/dateHelpers';

// Tipos de Retorno
export interface PortalDebtSummary {
    totalDue: number;
    nextDueDate: Date | null;
    pendingCount: number;
    hasLateInstallments: boolean;
}

export interface InstallmentDebtDetail {
    total: number; // Valor Cheio (Principal + Juros + Multa)
    principal: number;
    interest: number;
    lateFee: number;
    isLate: boolean;
    daysLate: number;
    dueDateISO: string;
    statusLabel: string;
    statusColor: string;
}

export interface PaymentOptions {
    totalToPay: number;       // Quitação (Capital + Juros + Multa)
    renewToPay: number;       // Renovação (Juros + Multa)
    breakdown: {
        principal: number;
        interest: number;
        fine: number;
    };
    canRenew: boolean;
}

/**
 * 1. RESUMO GERAL DA DÍVIDA (Card Principal)
 */
export const resolveDebtSummary = (loan: Loan, installments: Installment[]): PortalDebtSummary => {
    if (!loan || !installments) return { totalDue: 0, nextDueDate: null, pendingCount: 0, hasLateInstallments: false };

    const pending = installments.filter(i => i.status !== 'PAID');
    const loanCalc = normalizeLoanForCalc(loan);

    let totalDue = 0;
    let hasLate = false;

    // Soma inteligente: Usa o motor financeiro para cada parcela
    pending.forEach(inst => {
        const instCalc = normalizeInstallmentForCalc(inst);
        const debt = calculateTotalDue(loanCalc, instCalc);
        totalDue += debt.total; // total já inclui multa/mora se houver atraso
        
        if (debt.daysLate > 0) hasLate = true;
    });

    const nextDueDate = pending.length > 0 
        ? new Date(pending[0].dueDate) // Assume ordenação por data vinda do service
        : null;

    return {
        totalDue,
        nextDueDate,
        pendingCount: pending.length,
        hasLateInstallments: hasLate
    };
};

/**
 * 2. DETALHE DA PARCELA (Lista e Badges)
 */
export const resolveInstallmentDebt = (loan: Loan, inst: Installment): InstallmentDebtDetail => {
    const loanCalc = normalizeLoanForCalc(loan);
    const instCalc = normalizeInstallmentForCalc(inst);
    const debt = calculateTotalDue(loanCalc, instCalc);

    const isLate = debt.daysLate > 0;
    const daysDiff = getDaysDiff(inst.dueDate); // Negativo = Faltam dias, Positivo = Atrasado

    let statusLabel = 'Em dia';
    let statusColor = 'text-slate-500';

    if (inst.status === 'PAID') {
        statusLabel = 'Pago';
        statusColor = 'text-emerald-500';
    } else if (daysDiff > 0) {
        statusLabel = `Vencido há ${daysDiff} dias`;
        statusColor = 'text-rose-500 font-bold';
    } else if (daysDiff === 0) {
        statusLabel = 'Vence Hoje';
        statusColor = 'text-amber-500 font-bold animate-pulse';
    } else if (daysDiff > -3) {
        statusLabel = `Faltam ${Math.abs(daysDiff)} dias`;
        statusColor = 'text-amber-500';
    }

    return {
        total: debt.total,
        principal: debt.principal,
        interest: debt.interest,
        lateFee: debt.lateFee,
        isLate,
        daysLate: debt.daysLate,
        dueDateISO: inst.dueDate,
        statusLabel,
        statusColor
    };
};

/**
 * 3. OPÇÕES DE PAGAMENTO (Modal)
 * Define exatamente quanto cobrar em cada cenário.
 */
export const resolvePaymentOptions = (loan: Loan, inst: Installment): PaymentOptions => {
    const loanCalc = normalizeLoanForCalc(loan);
    const instCalc = normalizeInstallmentForCalc(inst);
    const debt = calculateTotalDue(loanCalc, instCalc);

    // Total a Pagar = Tudo
    const totalToPay = debt.total;

    // Renovação = Juros + Multa/Mora (Capital fica para depois)
    const renewToPay = debt.interest + debt.lateFee;

    return {
        totalToPay,
        renewToPay,
        breakdown: {
            principal: debt.principal,
            interest: debt.interest,
            fine: debt.lateFee
        },
        // Só permite renovar se houver juros ou multa a pagar. Se for só principal, é quitação.
        canRenew: (debt.interest + debt.lateFee) > 0
    };
};

// DEV ONLY
export const debugDebtCheck = (loan: Loan, inst: Installment) => {
    if (process.env.NODE_ENV === 'development') {
        const res = resolvePaymentOptions(loan, inst);
        console.group('💰 Debt Check');
        console.log('Loan:', loan.debtorName);
        console.log('Inst:', inst.number);
        console.log('Total (Principal+Interest+Fine):', res.totalToPay);
        console.log('Renew (Interest+Fine):', res.renewToPay);
        console.log('Breakdown:', res.breakdown);
        console.groupEnd();
    }
};
