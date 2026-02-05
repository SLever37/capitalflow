
import { Loan, Installment, LoanStatus } from '../../../types';
import { getDaysDiff, formatBRDate, parseDateOnlyUTC, addDaysUTC } from '../../../utils/dateHelpers';
import { calculateTotalDue, getInstallmentStatusLogic } from '../../../domain/finance/calculations';

export interface InstallmentViewModel {
    originalInst: Installment;
    realIndex: number;
    debt: ReturnType<typeof calculateTotalDue>;
    displayDueDate: string;
    paidUntilDate: string;
    daysDiff: number;
    isLateInst: boolean;
    isPaid: boolean;
    isPrepaid: boolean;
    isFixedTermDone: boolean;
    isActionDisabled: boolean;
    isZeroBalance: boolean;
    isFullyFinalized: boolean;
    daysPrepaid: number;
    statusText: string;
    statusColor: string;
    showProgress: boolean;
    isDailyFree: boolean;
    isFixedTerm: boolean;
}

/**
 * Retorna SEMPRE a data de vencimento exata do backend.
 */
export const calculateDisplayDueDate = (loan: Loan, inst: Installment, isDailyFree: boolean, isFixedTerm: boolean): string => {
    return inst.dueDate;
};

export const prepareInstallmentViewModel = (
    loan: Loan,
    inst: Installment,
    index: number,
    context: {
        fixedTermStats: any;
        isPaid: boolean;
        isZeroBalance: boolean;
        isFullyFinalized: boolean;
        showProgress: boolean;
        strategy: any;
        isDailyFree: boolean;
        isFixedTerm: boolean;
    }
): InstallmentViewModel => {
    const { isDailyFree, isFixedTerm, fixedTermStats, isPaid, isZeroBalance, isFullyFinalized, showProgress, strategy } = context;

    const st = getInstallmentStatusLogic(inst);
    const debt = calculateTotalDue(loan, inst);
    
    // Fonte da Verdade Inicial
    let displayDueDate = inst.dueDate;

    // FIX: Para contratos MENSAIS recém-renovados/criados onde start_date == due_date,
    // o sistema considera como vencimento em 30 dias (novo ciclo), não hoje.
    // Isso evita que o card fique Laranja (Vence Hoje) logo após renovar.
    if (!loan.billingCycle.includes('DAILY') && loan.startDate && inst.dueDate) {
        const d1 = parseDateOnlyUTC(loan.startDate).getTime();
        const d2 = parseDateOnlyUTC(inst.dueDate).getTime();
        if (d1 === d2) {
             displayDueDate = addDaysUTC(inst.dueDate, 30).toISOString();
        }
    }
    
    // Cálculo de dias baseado na data (possivelmente projetada)
    // Positivo = Atrasado | Zero = Hoje | Negativo = Futuro
    const daysDiff = getDaysDiff(displayDueDate);
    
    // isLateInst considera o status do banco OU o cálculo de dias corrigido
    const isLateInst = st === LoanStatus.LATE || (daysDiff > 0 && !isPaid);
    
    const isFixedTermDone = isFixedTerm && fixedTermStats && fixedTermStats.paidDays >= fixedTermStats.totalDays;
    const isInstPaid = inst.status === LoanStatus.PAID;
    const isActionDisabled = isInstPaid || isFullyFinalized;

    let isPrepaid = false;
    let daysPrepaid = 0;
    
    if (isDailyFree) {
        const due = new Date(displayDueDate); 
        const now = new Date();
        due.setHours(0, 0, 0, 0); now.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - now.getTime();
        if (diffTime > 0) { 
            isPrepaid = true; 
            daysPrepaid = Math.floor(diffTime / (1000 * 3600 * 24)); 
        }
    }

    let statusText = '';
    let statusColor = '';

    const strategyStatus = strategy?.card?.statusLabel 
        ? strategy.card.statusLabel({ ...inst, dueDate: displayDueDate }, daysDiff) 
        : null;

    if (isInstPaid || isZeroBalance) { 
        statusText = 'CONTRATO FINALIZADO'; 
        statusColor = 'text-emerald-500 font-black'; 
    }
    else if (isPrepaid) { 
        statusText = `Adiantado (${daysPrepaid} dias)`; 
        statusColor = 'text-emerald-400 font-black'; 
    }
    else if (isFixedTerm) { 
        const paidUntil = fixedTermStats?.paidUntilDate; 
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (isFixedTermDone) { 
            statusText = 'CONTRATO FINALIZADO'; 
            statusColor = 'text-emerald-500 font-black'; 
        } else if (paidUntil) {
            const diffTime = paidUntil.getTime() - today.getTime();
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (daysLeft >= 0) { 
                statusText = `EM DIA (Pago até ${formatBRDate(paidUntil)})`; 
                statusColor = 'text-emerald-400 font-black'; 
            } else { 
                statusText = `ATRASADO (${Math.abs(daysLeft)} dias)`; 
                statusColor = 'text-rose-500 font-black animate-pulse'; 
            }
        } else { 
            statusText = 'EM ABERTO'; 
            statusColor = 'text-blue-400'; 
        }
    }
    else if (strategyStatus) {
        statusText = strategyStatus.text;
        statusColor = strategyStatus.color;
    }
    else {
        if (daysDiff > 0) { 
            statusText = `Atrasado há ${daysDiff} dias`; 
            statusColor = 'text-rose-500 font-black'; 
        } 
        else if (daysDiff === 0) { 
            statusText = 'Vence HOJE'; 
            statusColor = 'text-amber-400 animate-pulse'; 
        }
        else { 
            // Negativo = Futuro
            statusText = `Faltam ${Math.abs(daysDiff)} dias`; 
            statusColor = 'text-blue-400'; 
        }
    }

    const realIndex = showProgress ? loan.installments.findIndex(original => original.id === inst.id) + 1 : index + 1;

    return {
        originalInst: inst,
        realIndex,
        debt,
        displayDueDate,
        paidUntilDate: displayDueDate,
        daysDiff,
        isLateInst,
        isPaid: isInstPaid,
        isPrepaid,
        isFixedTermDone: !!isFixedTermDone,
        isActionDisabled,
        isZeroBalance,
        isFullyFinalized,
        daysPrepaid,
        statusText,
        statusColor,
        showProgress,
        isDailyFree,
        isFixedTerm
    };
};
