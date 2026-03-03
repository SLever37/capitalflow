
import React from 'react';
import { ArrowUpRight, ArrowRightLeft, Wallet } from 'lucide-react';
import { formatMoney } from '../../utils/formatters';

export const ProfitCard = ({ balance, onWithdraw, isStealthMode }: { balance: number, onWithdraw: () => void, isStealthMode?: boolean }) => {
    return (
        <div className="relative overflow-hidden bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] hover:border-emerald-500/30 transition-all duration-300 group h-full flex flex-col justify-between">
            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-emerald-500 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity`}></div>

            <div>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-500 shadow-sm">
                            <ArrowUpRight size={20}/>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80">Caixa Livre</p>
                    </div>
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight my-3">{formatMoney(balance, isStealthMode)}</h3>
            </div>

            <div className="mt-auto">
                <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-2 flex items-center justify-between gap-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2 pl-2">
                        <Wallet size={12} className="text-slate-500"/>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Disponível</span>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onWithdraw(); }} 
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 shadow-lg shadow-emerald-900/20"
                    >
                        Resgatar <ArrowRightLeft size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
};
