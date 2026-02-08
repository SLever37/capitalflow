
import React from 'react';
import { Wallet, DollarSign, Calendar } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

interface PortalSummaryCardProps {
    totalJuridicoDevido: number;
    nextDueDate: Date | null;
}

export const PortalSummaryCard: React.FC<PortalSummaryCardProps> = ({ totalJuridicoDevido, nextDueDate }) => {
    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] border border-slate-700 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
                <Wallet size={120} />
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <DollarSign size={12}/> Saldo Devedor Atual
                </p>
                <p className="text-3xl font-black text-white tracking-tight">{formatMoney(totalJuridicoDevido)}</p>
                
                {nextDueDate && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                        <Calendar size={12} className="text-blue-400"/>
                        <p className="text-[10px] text-slate-300 font-bold uppercase">
                            Próx. Vencimento: <span className="text-white">{nextDueDate.toLocaleDateString('pt-BR')}</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
