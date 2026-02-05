
import React from 'react';
import { CheckCircle2, AlertTriangle, Calendar, ShieldAlert, Handshake, ChevronDown } from 'lucide-react';
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
}

export const Header: React.FC<HeaderProps> = ({
    loan, debtorNameSafe, isFullyFinalized, isLate, hasActiveAgreement, 
    daysUntilDue, iconStyle, isStealthMode
}) => {
    return (
      <div className="flex flex-col gap-3 w-full">
          {/* Linha 1: Ícone + Nome Completo */}
          <div className="flex items-start gap-3 w-full">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0 ${iconStyle}`}>
                {isFullyFinalized ? <CheckCircle2 size={20} /> : isLate ? <AlertTriangle size={20} /> : <Calendar size={20} />}
             </div>
             
             <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-base sm:text-lg font-black text-white uppercase leading-tight tracking-tight break-words line-clamp-2">
                    {debtorNameSafe}
                </h3>
             </div>
             
             {/* Indicador de expansão visual */}
             <div className="text-slate-600">
                 <ChevronDown size={16} />
             </div>
          </div>

          {/* Linha 2: Info Financeira + Status Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 pl-[3.25rem]">
             <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{formatMoney(loan.principal, isStealthMode)}</span>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                    {loan.billingCycle === 'DAILY_FREE' ? 'Diário' : loan.billingCycle === 'DAILY_FIXED_TERM' ? 'Prazo Fixo' : 'Mensal'}
                </span>
             </div>

             {/* Badge de Status */}
             <div className="ml-auto">
                 {isFullyFinalized ? (
                    <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                       <CheckCircle2 size={12} /> Finalizado
                    </div>
                 ) : hasActiveAgreement ? (
                    <div className="bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                       <Handshake size={12} /> Acordo Ativo
                    </div>
                 ) : isLate ? (
                    <div className="bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 animate-pulse">
                       <ShieldAlert size={12} /> {daysUntilDue} Dias Atraso
                    </div>
                 ) : (
                    <div className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                       <Calendar size={12} /> {daysUntilDue === 0 ? 'Vence Hoje' : `Em Dia`}
                    </div>
                 )}
             </div>
          </div>
      </div>
    );
};
