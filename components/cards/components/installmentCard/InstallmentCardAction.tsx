
import React from 'react';
import { MoreHorizontal, Lock } from 'lucide-react';
import { Loan, Installment } from '../../../../types';
import { CalculationResult } from '../../../../domain/finance/modalities/types';

interface InstallmentCardActionProps {
    isDisabled: boolean;
    isFullyFinalized: boolean;
    onPayment: (loan: Loan, inst: Installment, calculations: any) => void;
    loan: Loan;
    originalInst: Installment;
    debt: CalculationResult;
}

export const InstallmentCardAction: React.FC<InstallmentCardActionProps> = ({
    isDisabled,
    isFullyFinalized,
    onPayment,
    loan,
    originalInst,
    debt
}) => {
    if (!isDisabled) {
        return (
            <button 
                onClick={() => onPayment(loan, originalInst, debt)} 
                className="w-full py-2.5 sm:py-3 rounded-xl text-[8px] sm:text-[9px] font-black uppercase transition-all bg-blue-600 text-white shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 hover:bg-blue-500 active:scale-95"
            >
                <MoreHorizontal size={14} /> Gerenciar
            </button>
        );
    }

    return (
        <div className="w-full py-2.5 sm:py-3 rounded-xl text-[8px] sm:text-[9px] font-black uppercase transition-all bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center gap-2 cursor-not-allowed">
            <Lock size={12}/> {isFullyFinalized ? 'Contrato Finalizado' : 'Parcela Paga'}
        </div>
    );
};
