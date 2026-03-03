
import { Loan, Installment, LoanStatus } from '../../../types';
import { getDaysDiff, formatBRDate, parseDateOnlyUTC, todayDateOnlyUTC } from '../../../utils/dateHelpers';
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

    const debt = calculateTotalDue(loan, inst);
    
    // VÍNCULO DIRETO COM O CONTRATO: A data exibida é a data real da parcela no banco
    const displayDueDate = inst.dueDate;

    // Diferença em relação a HOJE (Positivo = Atrasado)
    const daysDiff = getDaysDiff(displayDueDate);
    
    // Status de Atraso real: Se a data passou e não está pago
    const isLateInst = daysDiff > 0 && inst.status !== LoanStatus.PAID;
    
    const isFixedTermDone = isFixedTerm && fixedTermStats && fixedTermStats.paidDays >= fixedTermStats.totalDays;
    const isInstPaid = inst.status === LoanStatus.PAID;
    const isActionDisabled = isInstPaid || isFullyFinalized;

    let isPrepaid = false;
    let daysPrepaid = 0;
    
    if (isDailyFree) {
        if (daysDiff < 0) { 
            isPrepaid = true; 
            daysPrepaid = Math.abs(daysDiff); 
        }
    }

    let statusText = '';
    let statusColor = '';

    // LÓGICA DE STATUS - MODO FOCO
    if (isInstPaid || isZeroBalance) { 
        statusText = 'CONTRATO FINALIZADO'; 
        statusColor = 'text-emerald-500 font-black'; 
    }
    else if (isLateInst) {
        statusText = `VENCIDO HÁ ${daysDiff} ${daysDiff === 1 ? 'DIA' : 'DIAS'}`; 
        statusColor = 'text-rose-500 font-black animate-pulse'; 
    }
    else if (isPrepaid) { 
        statusText = `ADIANTADO (${daysPrepaid} DIAS)`; 
        statusColor = 'text-emerald-400 font-black'; 
    }
    else if (isFixedTerm) { 
        const paidUntil = fixedTermStats?.paidUntilDate; 
        if (isFixedTermDone) { 
            statusText = 'CONTRATO FINALIZADO'; 
            statusColor = 'text-emerald-500 font-black'; 
        } else if (paidUntil) {
            const diff = getDaysDiff(paidUntil);
            if (diff <= 0) { 
                statusText = `EM DIA (Até ${formatBRDate(paidUntil)})`; 
                statusColor = 'text-emerald-400 font-black'; 
            } else { 
                statusText = `ATRASADO (${Math.abs(diff)} dias)`; 
                statusColor = 'text-rose-500 font-black animate-pulse'; 
            }
        } else { 
            statusText = 'EM ABERTO'; 
            statusColor = 'text-blue-400'; 
        }
    }
    else {
        if (daysDiff === 0) { 
            statusText = 'VENCE HOJE'; 
            statusColor = 'text-amber-400 animate-pulse font-black'; 
        }
        else { 
            statusText = `FALTAM ${Math.abs(daysDiff)} DIAS`; 
            statusColor = 'text-blue-400 font-bold'; 
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
