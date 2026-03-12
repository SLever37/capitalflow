
import React from 'react';
import { MoreHorizontal, Lock } from 'lucide-react';
import { Loan, Installment } from '../../../../types';
import { CalculationResult } from '../../../../domain/finance/modalities/types';

interface InstallmentCardActionProps {
    isDisabled: boolean;
    isFullyFinalized: boolean;
    loan: Loan;
    originalInst: Installment;
    debt: CalculationResult;
}

export const InstallmentCardAction: React.FC<InstallmentCardActionProps> = ({
    isDisabled,
    isFullyFinalized,
    loan,
    originalInst,
    debt
}) => {
    if (!isDisabled) {
        return (
            <button 
                className="w-full py-2.5 sm:py-3 rounded-xl text-[10px] font-black uppercase transition-all bg-blue-600 text-white shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 hover:bg-blue-500 active:scale-95 text-wrap-safe leading-tight"
            >
                <MoreHorizontal size={14} className="shrink-0" /> Abrir Contrato
            </button>
        );
    }

    return (
        <div className="w-full py-2.5 sm:py-3 rounded-xl text-[10px] font-black uppercase transition-all bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center gap-2 cursor-not-allowed text-wrap-safe leading-tight">
            <Lock size={12} className="shrink-0" /> {isFullyFinalized ? 'Contrato Finalizado' : 'Parcela Paga'}
        </div>
    );
};
