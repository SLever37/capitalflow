
import React from 'react';
import { formatBRDate, addDaysUTC } from '../../../../utils/dateHelpers';
import { Loan, Installment } from '../../../../types';

interface InstallmentCardTimelineProps {
    loan: Loan;
    originalInst: Installment;
    displayDueDate: string; // Data calculada para exibição (pode ser projetada)
    paidUntilDate: string;  // Data efetiva de cobertura/vencimento
    strategy: any;
    isPrepaid: boolean;
    isLateInst: boolean;
    isPaid: boolean;
}

export const InstallmentCardTimeline: React.FC<InstallmentCardTimelineProps> = ({
    loan,
    originalInst,
    paidUntilDate,
    strategy,
    isPrepaid,
    isLateInst,
    isPaid
}) => {
    // Determina a cor da data de vencimento
    const dueDateColorClass = isPrepaid 
        ? 'text-emerald-400' 
        : isLateInst && !isPaid 
            ? 'text-rose-400' 
            : 'text-white';

    const label = strategy?.card?.dueDateLabel ? strategy.card.dueDateLabel(originalInst, loan) : "Vencimento";

    // CORREÇÃO VISUAL: Se o contrato for Mensal e a data de vencimento estiver igual à data de início (início de ciclo),
    // forçamos a exibição de +30 dias para evitar confusão visual.
    let finalDisplayDate = paidUntilDate;
    if (!loan.billingCycle.includes('DAILY') && formatBRDate(paidUntilDate) === formatBRDate(loan.startDate)) {
        finalDisplayDate = addDaysUTC(loan.startDate, 30).toISOString();
    }

    return (
        <div className="relative pl-3 border-l-2 border-slate-800 space-y-3 my-2">
            {/* DATA DO EMPRÉSTIMO / CONTRATO */}
            <div className="relative">
                <div className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-900"></div>
                <p className="text-[9px] font-bold text-slate-500 uppercase leading-none tracking-wider">Data do Contrato</p>
                <p className="text-xs font-bold text-slate-300 mt-0.5">{formatBRDate(loan.startDate)}</p>
            </div>

            {/* DATA DE VENCIMENTO / PAGO ATÉ */}
            <div className="relative">
                <div className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-900"></div>
                <p className="text-[9px] font-bold text-slate-500 uppercase leading-none tracking-wider">
                    {label}
                </p>
                <p className={`text-xs font-black mt-0.5 ${dueDateColorClass}`}>
                    {formatBRDate(finalDisplayDate)}
                </p>
            </div>
        </div>
    );
};
