
import { useState, useMemo, useEffect } from 'react';
import { Loan, Installment } from '../../../../types';
import { parseDateOnlyUTC, addDaysUTC, todayDateOnlyUTC } from '../../../../utils/dateHelpers';
import { paymentModalityDispatcher } from '../../../../features/payments/modality/index';

interface UsePaymentManagerProps {
    data: {loan: Loan, inst: Installment, calculations: any} | null;
    paymentType: string;
    setPaymentType: (t: any) => void;
    avAmount: string;
    setAvAmount: (v: string) => void;
}

export const usePaymentManagerState = ({ data, paymentType, setPaymentType, avAmount, setAvAmount }: UsePaymentManagerProps) => {
    const [customAmount, setCustomAmount] = useState('');
    const [manualDateStr, setManualDateStr] = useState('');
    const [subMode, setSubMode] = useState<'DAYS' | 'AMORTIZE'>('DAYS');

    // Cálculos blindados contra NaN
    const fixedTermData = useMemo(() => {
        if (data?.loan?.billingCycle === 'DAILY_FIXED_TERM' && data.inst) {
            try {
                const start = parseDateOnlyUTC(data.loan.startDate);
                const due = parseDateOnlyUTC(data.inst.dueDate);
                
                const startMs = start.getTime();
                const dueMs = due.getTime();
                
                if (isNaN(startMs) || isNaN(dueMs)) throw new Error("Datas inválidas");

                const days = Math.round((dueMs - startMs) / 86400000);
                const safeDays = days > 0 ? days : 1; 
                const dailyVal = (data.loan.totalToReceive || 0) / safeDays;

                const currentDebt = (Number(data.inst.principalRemaining) || 0) + (Number(data.inst.interestRemaining) || 0);
                const amountPaid = Math.max(0, (data.loan.totalToReceive || 0) - currentDebt);
                
                const paidDays = dailyVal > 0 ? Math.floor((amountPaid + 0.1) / dailyVal) : 0;
                const paidUntil = addDaysUTC(start, paidDays);

                return { dailyVal, paidUntil, totalDays: safeDays, paidDays, currentDebt };
            } catch (e) {
                console.error("Erro no cálculo FixedTerm:", e);
            }
        }
        return { dailyVal: 0, paidUntil: todayDateOnlyUTC(), totalDays: 0, paidDays: 0, currentDebt: 0 };
    }, [data?.loan?.id, data?.inst?.id]);

    useEffect(() => {
        if (data) {
            if (data.loan.billingCycle === 'DAILY_FREE' || data.loan.billingCycle === ('DAILY_FIXED' as any)) {
                setPaymentType('CUSTOM');
                setManualDateStr('');
                setSubMode('DAYS');
            } else if (data.loan.billingCycle === 'DAILY_FIXED_TERM') {
                setPaymentType('RENEW_AV');
                
                // Cálculo estável para sugestão de valor
                const start = parseDateOnlyUTC(data.loan.startDate);
                const due = parseDateOnlyUTC(data.inst.dueDate);
                const days = Math.max(1, Math.round((due.getTime() - start.getTime()) / 86400000));
                const dailyVal = (data.loan.totalToReceive || 0) / days;
                
                if (dailyVal > 0 && !isNaN(dailyVal)) {
                    setAvAmount(dailyVal.toFixed(2));
                }
            } else {
                setPaymentType(paymentModalityDispatcher.getConfig(data.loan).defaultAction);
            }
            
            if(data.loan.billingCycle !== 'DAILY_FIXED_TERM') {
                setAvAmount('');
            }
            setCustomAmount('');
        }
    }, [data?.loan?.id, data?.inst?.id]);

    return {
        customAmount, setCustomAmount,
        manualDateStr, setManualDateStr,
        subMode, setSubMode,
        fixedTermData
    };
};
