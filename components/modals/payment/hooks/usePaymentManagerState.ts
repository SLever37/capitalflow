import { useState, useMemo, useEffect } from 'react';
import { Loan, Installment } from '../../../../types';
import { parseDateOnlyUTC, addDaysUTC, todayDateOnlyUTC, toISODateOnlyUTC, getDaysDiff } from '../../../../utils/dateHelpers';
import { paymentModalityDispatcher } from '../../../../features/payments/modality/index';

interface UsePaymentManagerProps {
    data: {loan: Loan, inst: Installment, calculations: any} | null;
    paymentType: string;
    setPaymentType: (t: any) => void;
    avAmount: string;
    setAvAmount: (v: string) => void;
}

export type ForgivenessMode = 'NONE' | 'FINE_ONLY' | 'INTEREST_ONLY' | 'BOTH';

export const usePaymentManagerState = ({ data, paymentType, setPaymentType, avAmount, setAvAmount }: UsePaymentManagerProps) => {
    const [customAmount, setCustomAmount] = useState('');
    const [manualDateStr, setManualDateStr] = useState(''); 
    const [realPaymentDateStr, setRealPaymentDateStr] = useState(toISODateOnlyUTC(new Date()));
    const [subMode, setSubMode] = useState<'DAYS' | 'AMORTIZE'>('DAYS');
    
    // Novo estado de perdão granular
    const [forgivenessMode, setForgivenessMode] = useState<ForgivenessMode>('NONE');
    const [interestHandling, setInterestHandling] = useState<'CAPITALIZE' | 'KEEP_PENDING'>('KEEP_PENDING');

    // 1. Detalhamento da Dívida (Recálculo local para separar Multa de Mora)
    const debtBreakdown = useMemo(() => {
        if (!data) return { principal: 0, interest: 0, fine: 0, dailyMora: 0, total: 0 };

        const { loan, inst, calculations } = data;
        const daysLate = Math.max(0, getDaysDiff(inst.dueDate));
        
        const principal = calculations.principal;
        const interest = calculations.interest; // Juros do ciclo (lucro)
        
        // Recalcula multa fixa e mora diária separadamente
        let fine = 0;
        let dailyMora = 0;

        if (daysLate > 0) {
            const base = principal + interest;
            fine = base * (loan.finePercent / 100);
            dailyMora = base * (loan.dailyInterestPercent / 100) * daysLate;
        }

        // Aplica o perdão selecionado
        let finalFine = fine;
        let finalMora = dailyMora;

        if (forgivenessMode === 'FINE_ONLY') finalFine = 0;
        if (forgivenessMode === 'INTEREST_ONLY') finalMora = 0;
        if (forgivenessMode === 'BOTH') { finalFine = 0; finalMora = 0; }

        return {
            principal,
            interest,
            fine: finalFine,
            dailyMora: finalMora,
            total: principal + interest + finalFine + finalMora
        };
    }, [data, forgivenessMode]);

    // 2. Cálculo de Mensalidades Virtuais (Acumuladas no atraso)
    const virtualSchedule = useMemo(() => {
        if (!data) return [];
        const { inst } = data;
        const today = todayDateOnlyUTC();
        const dueDate = parseDateOnlyUTC(inst.dueDate);
        
        const schedule = [];
        let cursorDate = new Date(dueDate);

        // Adiciona a parcela original
        // Enquanto a data do cursor for menor ou igual a hoje (com margem de ciclo), adiciona
        // Limitado a 12 meses para performance
        let count = 1;
        while (count <= 12) {
             const diff = Math.round((today.getTime() - cursorDate.getTime()) / 86400000);
             let status: 'LATE' | 'OPEN' | 'FUTURE' = 'OPEN';
             
             if (diff > 0) status = 'LATE';
             else if (diff < -30) status = 'FUTURE';
             
             // Se for muito futuro, para
             if (status === 'FUTURE') break;

             schedule.push({
                 date: new Date(cursorDate),
                 daysDiff: diff,
                 number: count
             });

             // Avança 30 dias (ciclo padrão para visualização)
             cursorDate = addDaysUTC(cursorDate, 30);
             count++;
        }

        return schedule;
    }, [data?.inst?.dueDate]);

    const fixedTermData = useMemo(() => {
        if (data?.loan?.billingCycle === 'DAILY_FIXED_TERM' && data.inst) {
            try {
                const start = parseDateOnlyUTC(data.loan.startDate);
                const due = parseDateOnlyUTC(data.inst.dueDate);
                
                const startMs = start.getTime();
                const dueMs = due.getTime();
                
                const days = Math.round((dueMs - startMs) / 86400000);
                const safeDays = days > 0 ? days : 1; 
                const dailyVal = (data.loan.totalToReceive || 0) / safeDays;

                const currentDebt = (Number(data.inst.principalRemaining) || 0) + (Number(data.inst.interestRemaining) || 0);
                const amountPaid = Math.max(0, (data.loan.totalToReceive || 0) - currentDebt);
                
                const paidDays = dailyVal > 0 ? Math.floor((amountPaid + 0.1) / dailyVal) : 0;
                const paidUntil = addDaysUTC(start, paidDays);

                return { dailyVal, paidUntil, totalDays: safeDays, paidDays, currentDebt };
            } catch (e) { console.error(e); }
        }
        return { dailyVal: 0, paidUntil: todayDateOnlyUTC(), totalDays: 0, paidDays: 0, currentDebt: 0 };
    }, [data?.loan?.id, data?.inst?.id]);

    useEffect(() => {
        if (data) {
            setForgivenessMode('NONE');
            setInterestHandling('KEEP_PENDING');
            setRealPaymentDateStr(toISODateOnlyUTC(new Date()));

            if (data.loan.billingCycle === 'DAILY_FREE' || data.loan.billingCycle === ('DAILY_FIXED' as any)) {
                setPaymentType('CUSTOM');
                setSubMode('DAYS');
            } else if (data.loan.billingCycle === 'DAILY_FIXED_TERM') {
                setPaymentType('RENEW_AV');
                const start = parseDateOnlyUTC(data.loan.startDate);
                const due = parseDateOnlyUTC(data.inst.dueDate);
                const days = Math.max(1, Math.round((due.getTime() - start.getTime()) / 86400000));
                const dailyVal = (data.loan.totalToReceive || 0) / days;
                if (dailyVal > 0) setAvAmount(dailyVal.toFixed(2));
            } else {
                setPaymentType(paymentModalityDispatcher.getConfig(data.loan).defaultAction);
            }
            
            if(data.loan.billingCycle !== 'DAILY_FIXED_TERM') setAvAmount('');
            setCustomAmount('');

            const currentDueDate = parseDateOnlyUTC(data.inst.dueDate);
            let daysToAdd = data.loan.billingCycle.includes('DAILY') ? 1 : 30;
            setManualDateStr(toISODateOnlyUTC(addDaysUTC(currentDueDate, daysToAdd)));
        }
    }, [data?.loan?.id, data?.inst?.id]);

    return {
        customAmount, setCustomAmount,
        manualDateStr, setManualDateStr, 
        realPaymentDateStr, setRealPaymentDateStr,
        subMode, setSubMode,
        fixedTermData,
        forgivenessMode, setForgivenessMode,
        interestHandling, setInterestHandling,
        debtBreakdown,
        virtualSchedule
    };
};