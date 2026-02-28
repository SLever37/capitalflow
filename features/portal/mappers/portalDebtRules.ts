
import { Loan, Installment } from '../../../types';
import { calculateTotalDue } from '../../../domain/finance/calculations';
import { normalizeLoanForCalc, normalizeInstallmentForCalc } from './portalAdapters';
import { getDaysDiff } from '../../../utils/dateHelpers';
import { loanEngine } from '../../../domain/loanEngine';
import { isDev } from '../../../utils/isDev';

// Tipos de Retorno
export interface PortalDebtSummary {
    totalDue: number;
    nextDueDate: Date | null;
    pendingCount: number;
    hasLateInstallments: boolean;
    maxDaysLate: number; // Novo: para notificações
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
    // Novos campos para UI correta
    daysLate: number;
    dueDateISO: string;
}

/**
 * HELPER DE LABEL DE VENCIMENTO (Regra Centralizada)
 */
export const getPortalDueLabel = (daysLate: number, dueDateISO: string) => {
    // 1. Atrasado real (multa aplicável ou passado)
    if (daysLate > 0) {
        return { 
            label: `Vencido há ${daysLate} dia${daysLate === 1 ? '' : 's'}`, 
            detail: '(+ Taxas e Multas inclusas)',
            variant: 'OVERDUE' 
        };
    }

    // Calcula diferença real (negativo = futuro) para labels de "Vence em..."
    const rawDiff = -getDaysDiff(dueDateISO); // getDaysDiff retorna (hoje - data). Invertemos para (data - hoje).

    // 2. Vence Hoje
    if (rawDiff === 0) {
        return { 
            label: 'Vence hoje', 
            detail: '',
            variant: 'DUE_TODAY' 
        };
    }

    // 3. Futuro
    if (rawDiff > 0) {
        return { 
            label: `Vence em ${rawDiff} dia${rawDiff === 1 ? '' : 's'}`, 
            detail: '',
            variant: 'DUE_SOON' 
        };
    }

    // Fallback (passado mas sem daysLate > 0, ex: pago ou tolerância)
    return { label: 'Em dia', detail: '', variant: 'OK' };
};

/**
 * 1. RESUMO GERAL DA DÍVIDA (Card Principal)
 */
export const resolveDebtSummary = (loan: Loan, installments: Installment[]): PortalDebtSummary => {
    if (!loan || !installments) return { totalDue: 0, nextDueDate: null, pendingCount: 0, hasLateInstallments: false, maxDaysLate: 0 };

    const balance = loanEngine.computeRemainingBalance(loan);
    const pending = installments.filter(i => {
        const isPaidByStatus = i.status === 'PAID';
        const isPaidByBalance = (Number(i.principalRemaining) || 0) === 0 && (Number(i.interestRemaining) || 0) === 0;
        return !isPaidByStatus && !isPaidByBalance;
    });

    const loanCalc = normalizeLoanForCalc(loan);
    let maxDaysLate = 0;
    pending.forEach(inst => {
        const instCalc = normalizeInstallmentForCalc(inst);
        const debt = calculateTotalDue(loanCalc, instCalc);
        if (debt.daysLate > maxDaysLate) maxDaysLate = debt.daysLate;
    });

    return {
        totalDue: balance.totalRemaining,
        nextDueDate: pending.length > 0 ? new Date(pending[0].dueDate) : null,
        pendingCount: pending.length,
        hasLateInstallments: maxDaysLate > 0,
        maxDaysLate
    };
};

/**
 * 2. DETALHE DA PARCELA (Lista e Badges)
 */
export const resolveInstallmentDebt = (loan: Loan, inst: Installment): InstallmentDebtDetail => {
    const loanCalc = normalizeLoanForCalc(loan);
    const instCalc = normalizeInstallmentForCalc(inst);
    const debt = calculateTotalDue(loanCalc, instCalc);

    // CORREÇÃO: Verificar se parcela está realmente quitada (status OU saldo zerado)
    const isPaidByStatus = inst.status === 'PAID';
    const isPaidByBalance = (Number(inst.principalRemaining) || 0) === 0 && (Number(inst.interestRemaining) || 0) === 0;
    const isPaidOff = isPaidByStatus || isPaidByBalance;

    const isLate = debt.daysLate > 0;
    const dueInfo = getPortalDueLabel(debt.daysLate, inst.dueDate);

    let statusLabel = dueInfo.label;
    let statusColor = 'text-slate-500';

    if (isPaidOff) {
        statusLabel = 'Quitada';
        statusColor = 'text-emerald-500';
    } else if (dueInfo.variant === 'OVERDUE') {
        statusColor = 'text-rose-500 font-bold';
    } else if (dueInfo.variant === 'DUE_TODAY') {
        statusColor = 'text-amber-500 font-bold animate-pulse';
    } else if (dueInfo.variant === 'DUE_SOON') {
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
        canRenew: (debt.interest + debt.lateFee) > 0,
        daysLate: debt.daysLate,
        dueDateISO: inst.dueDate
    };
};

// DEV ONLY
export const debugDebtCheck = (loan: Loan, inst: Installment) => {
    if (isDev) {
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
