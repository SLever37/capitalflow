
import React from 'react';
import { formatMoney } from '../../../../utils/formatters';
import { CalculationResult } from '../../../../domain/finance/modalities/types';

interface InstallmentCardAmountsProps {
    debt: CalculationResult;
    isPrepaid: boolean;
    isLateInst: boolean;
    isPaid: boolean;
    isStealthMode?: boolean;
}

export const InstallmentCardAmounts: React.FC<InstallmentCardAmountsProps> = ({
    debt,
    isPrepaid,
    isLateInst,
    isPaid,
    isStealthMode
}) => {
    // Se estiver pago ou não houver juros/multa a mostrar, mostra apenas principal (ou total pago)
    // A lógica original mostrava: Principal + (Juros se > 0 e não adiantado)
    
    const showInterestBlock = (debt.interest + debt.lateFee) > 0 && !isPrepaid;
    
    // Cor do bloco de juros
    const interestColorClass = isLateInst && !isPaid ? 'text-rose-500' : 'text-emerald-500';

    return (
        <div className="mb-4 sm:mb-5">
            <div className="flex flex-col">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg sm:text-xl font-black text-white" title="Principal Restante">
                        {formatMoney(debt.principal, isStealthMode)}
                    </span>
                    
                    {showInterestBlock && (
                        <>
                            <span className="text-slate-500 font-bold">+</span>
                            <span className={`text-lg sm:text-xl font-black ${interestColorClass}`} title="Juros + Multas">
                                {formatMoney(debt.interest + debt.lateFee, isStealthMode)}
                            </span>
                        </>
                    )}
                </div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                    {isPrepaid ? 'Principal (Juros Pagos)' : 'Total (Principal + Encargos)'}
                </p>
            </div>
        </div>
    );
};
