
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

    // Cálculo do valor diário teórico para Fixed Term
    const fixedTermData = useMemo(() => {
        if (data?.loan?.billingCycle === 'DAILY_FIXED_TERM') {
            const start = parseDateOnlyUTC(data.loan.startDate);
            const due = parseDateOnlyUTC(data.inst.dueDate);
            const days = Math.round((due.getTime() - start.getTime()) / 86400000);
            const safeDays = days > 0 ? days : 1; 
            const dailyVal = (data.loan.totalToReceive || 0) / safeDays;

            // Calcular o "Pago Até" Atual e Dias Pagos
            const currentDebt = (Number(data.inst.principalRemaining) || 0) + (Number(data.inst.interestRemaining) || 0);
            const amountPaid = Math.max(0, (data.loan.totalToReceive || 0) - currentDebt);
            
            // Adiciona tolerância (0.1) para evitar que dízimas periódicas ocultem o último dia
            const paidDays = dailyVal > 0 ? Math.floor((amountPaid + 0.1) / dailyVal) : 0;
            const paidUntil = addDaysUTC(start, paidDays);

            return { dailyVal, paidUntil, totalDays: safeDays, paidDays, currentDebt };
        }
        return { dailyVal: 0, paidUntil: todayDateOnlyUTC(), totalDays: 0, paidDays: 0, currentDebt: 0 };
    }, [data]);

    useEffect(() => {
        if (data) {
            if (data.loan.billingCycle === 'DAILY_FREE' || data.loan.billingCycle === ('DAILY_FIXED' as any)) {
                setPaymentType('CUSTOM');
                setManualDateStr('');
                setSubMode('DAYS');
            } else if (data.loan.billingCycle === 'DAILY_FIXED_TERM') {
                setPaymentType('RENEW_AV');
                // Sugere o valor da diária se o campo estiver vazio
                if (!avAmount && fixedTermData.dailyVal > 0) {
                    setAvAmount(fixedTermData.dailyVal.toFixed(2));
                }
            } else {
                setPaymentType(paymentModalityDispatcher.getConfig(data.loan).defaultAction);
            }
            if(data.loan.billingCycle !== 'DAILY_FIXED_TERM') setAvAmount('');
            setCustomAmount('');
        }
    }, [data, fixedTermData.dailyVal]); // setPaymentType e setAvAmount removidos do dep array para evitar loop

    return {
        customAmount, setCustomAmount,
        manualDateStr, setManualDateStr,
        subMode, setSubMode,
        fixedTermData
    };
};
