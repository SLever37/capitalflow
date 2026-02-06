
import React from 'react';
import { CheckCircle2, AlertTriangle, Calendar, ShieldAlert, Handshake, ChevronDown, ChevronUp, Clock, Wallet } from 'lucide-react';
import { Loan } from '../../../types';
import { formatMoney } from '../../../utils/formatters';

interface HeaderProps {
    loan: Loan;
    debtorNameSafe: string;
    isFullyFinalized: boolean;
    isLate: boolean;
    hasActiveAgreement: boolean;
    daysUntilDue: number;
    nextDueDate: string | null | undefined;
    iconStyle: string;
    isStealthMode?: boolean;
    isExpanded?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
    loan, debtorNameSafe, isFullyFinalized, isLate, hasActiveAgreement, 
    daysUntilDue, iconStyle, isStealthMode, isExpanded
}) => {
    
    // Cálculo do valor a exibir:
    // Se estiver atrasado, mostra o total a receber (dá noção do risco).
    // Se estiver em dia, mostra o Principal (capital investido).
    const displayAmount = isLate ? loan.totalToReceive : loan.principal;
    const amountLabel = isLate ? 'Total em Risco' : 'Capital Principal';

    // Badge Logic
    let Badge = null;
    
    if (isFullyFinalized) {
        Badge = (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                <CheckCircle2 size={12} className="shrink-0"/>
                <span className="text-[10px] font-black uppercase tracking-wider">Finalizado</span>
            </div>
        );
    } else if (hasActiveAgreement) {
        Badge = (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                <Handshake size={12} className="shrink-0"/>
                <span className="text-[10px] font-black uppercase tracking-wider">Acordo</span>
            </div>
        );
    } else if (isLate) {
        Badge = (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 rounded-lg border border-rose-500/20 animate-pulse">
                <ShieldAlert size={12} className="shrink-0"/>
                <span className="text-[10px] font-black uppercase tracking-wider">{daysUntilDue} Dias Atraso</span>
            </div>
        );
    } else {
        const isToday = daysUntilDue === 0;
        Badge = (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${isToday ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                {isToday ? <Clock size={12} className="shrink-0"/> : <Calendar size={12} className="shrink-0"/>}
                <span className="text-[10px] font-black uppercase tracking-wider">{isToday ? 'Vence Hoje' : 'Em Dia'}</span>
            </div>
        );
    }

    return (
      <div className="w-full flex flex-col gap-4">
          {/* TOPO: Identidade do Cliente e Toggle */}
          <div className="flex items-center justify-between gap-3">
             <div className="flex items-center gap-3 min-w-0">
                 <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${iconStyle}`}>
                    {isFullyFinalized ? <CheckCircle2 size={22} /> : isLate ? <AlertTriangle size={22} /> : <Calendar size={22} />}
                 </div>
                 
                 <div className="min-w-0 flex flex-col">
                    <h3 className="text-base sm:text-lg font-black text-white uppercase leading-tight tracking-tight truncate">
                        {debtorNameSafe}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">
                       {loan.billingCycle === 'DAILY_FREE' ? 'Giro Diário' : loan.billingCycle === 'DAILY_FIXED_TERM' ? 'Prazo Fixo' : 'Giro Mensal'} • {loan.id.substring(0,6)}
                    </p>
                 </div>
             </div>

             <div className={`text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                 <ChevronDown size={20} />
             </div>
          </div>

          {/* BASE: Informações Financeiras e Status */}
          <div className="flex items-center justify-between pl-[3.5rem] relative">
             {/* Linha vertical decorativa */}
             <div className="absolute left-[1.35rem] top-[-1rem] bottom-1 w-px bg-slate-800/50"></div>

             <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Wallet size={10} /> {amountLabel}
                </span>
                <span className={`text-sm sm:text-base font-black ${isLate && !hasActiveAgreement ? 'text-rose-400' : isFullyFinalized ? 'text-emerald-400' : 'text-white'}`}>
                    {formatMoney(displayAmount, isStealthMode)}
                </span>
             </div>

             <div>
                 {Badge}
             </div>
          </div>
      </div>
    );
};
