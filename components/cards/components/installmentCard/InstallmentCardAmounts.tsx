
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
    const hasCharges = (debt.interest + debt.lateFee) > 0;
    const showInterestBlock = hasCharges && !isPrepaid;
    
    // Cor do bloco de juros
    const interestColorClass = isLateInst && !isPaid ? 'text-rose-500' : 'text-emerald-500';

    return (
        <div className="mb-4 sm:mb-5">
            <div className="flex flex-col space-y-3">
                {/* Bloco de Valores Detalhados */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Principal</span>
                        <span className="text-sm sm:text-base font-black text-white">
                            {formatMoney(debt.principal, isStealthMode)}
                        </span>
                    </div>
                    
                    {showInterestBlock && (
                        <div className="flex flex-col">
                            <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isLateInst && !isPaid ? 'text-rose-500/70' : 'text-emerald-500/70'}`}>
                                Encargos
                            </span>
                            <span className={`text-sm sm:text-base font-black ${interestColorClass}`}>
                                {formatMoney(debt.interest + debt.lateFee, isStealthMode)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Total Consolidado */}
                <div className="pt-2 border-t border-slate-800/50">
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg sm:text-xl font-black text-white">
                            {formatMoney(debt.total, isStealthMode)}
                        </span>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                            {isPrepaid ? 'Total (Juros Pagos)' : 'Total (Principal + Encargos)'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
