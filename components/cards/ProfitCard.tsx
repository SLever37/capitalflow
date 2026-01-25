
import React from 'react';
import { ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import { formatMoney } from '../../utils/formatters';

export const ProfitCard = ({ balance, onWithdraw, isStealthMode }: { balance: number, onWithdraw: () => void, isStealthMode?: boolean }) => (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-xl hover:border-blue-500/50 transition-all duration-300 relative group flex flex-col justify-between h-full min-h-[130px]">
        <div>
            <div className="flex justify-between items-start mb-3">
                <div className="p-3 bg-slate-900 rounded-xl text-blue-400">
                    <ArrowUpRight />
                </div>
                <button onClick={(e) => { e.stopPropagation(); onWithdraw(); }} className="p-2 px-3 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase hover:scale-105 transition-transform flex items-center gap-1 shadow-lg shadow-emerald-900/20">
                    Resgatar <ArrowRightLeft size={10} />
                </button>
            </div>
            <div>
                <p className="text-slate-400 text-sm font-medium">Lucro Disponível</p>
                <h3 className="text-2xl font-bold text-white mt-1">{formatMoney(balance, isStealthMode)}</h3>
            </div>
        </div>
    </div>
);
