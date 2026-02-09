
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, User, ShieldAlert, AlertCircle, CheckCircle2, Wallet, Layers } from 'lucide-react';
import { ClientGroup } from '../../domain/dashboard/loanGrouping';
import { formatMoney } from '../../utils/formatters';
import { LoanCard } from './LoanCard';

interface ClientGroupCardProps {
    group: ClientGroup;
    // Props passadas para o LoanCard (drill-down)
    passThroughProps: any;
    isStealthMode: boolean;
}

export const ClientGroupCard: React.FC<ClientGroupCardProps> = ({ group, passThroughProps, isStealthMode }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Definição de Cores do Header baseada no Status do Grupo
    let statusColor = 'border-slate-800 bg-slate-900';
    let icon = <User className="text-slate-400" size={24} />;
    let statusText = 'Regular';
    let statusTextColor = 'text-slate-400';

    if (group.status === 'CRITICAL') {
        statusColor = 'border-rose-600/50 bg-rose-950/20';
        icon = <ShieldAlert className="text-rose-500" size={24} />;
        statusText = 'Risco Crítico';
        statusTextColor = 'text-rose-500';
    } else if (group.status === 'LATE') {
        statusColor = 'border-amber-600/50 bg-amber-950/20';
        icon = <AlertCircle className="text-amber-500" size={24} />;
        statusText = 'Em Atraso';
        statusTextColor = 'text-amber-500';
    } else if (group.status === 'PAID') {
        statusColor = 'border-emerald-600/50 bg-emerald-950/20';
        icon = <CheckCircle2 className="text-emerald-500" size={24} />;
        statusText = 'Sem Pendências';
        statusTextColor = 'text-emerald-500';
    }

    return (
        <div className={`rounded-3xl border transition-all duration-300 overflow-hidden mb-4 ${statusColor} ${isExpanded ? 'shadow-2xl' : 'shadow-md'}`}>
            
            {/* HEADER DO GRUPO (Clicável para Expandir) */}
            <div 
                className="p-5 cursor-pointer flex flex-col gap-4 relative"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Linha Superior: Avatar e Info */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            {group.avatarUrl ? (
                                <img src={group.avatarUrl} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" alt={group.clientName} />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
                                    {icon}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1 border border-slate-700">
                                {isExpanded ? <ChevronUp size={14} className="text-white"/> : <ChevronDown size={14} className="text-white"/>}
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-white font-black text-lg uppercase leading-tight">{group.clientName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border bg-slate-950/50 ${statusTextColor} border-current opacity-80`}>
                                    {statusText}
                                </span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase flex items-center gap-1">
                                    <Layers size={10}/> {group.contractCount} Contratos
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Linha Inferior: Resumo Financeiro */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 mt-1">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Wallet size={16}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Dívida Total</span>
                    </div>
                    <span className={`text-xl font-black ${group.totalDebt < 0.1 ? 'text-emerald-500' : 'text-white'}`}>
                        {formatMoney(group.totalDebt, isStealthMode)}
                    </span>
                </div>
            </div>

            {/* CORPO DO GRUPO (Lista de Contratos) */}
            {isExpanded && (
                <div className="bg-slate-950/50 p-3 sm:p-4 space-y-4 border-t border-slate-800 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] text-slate-500 font-bold uppercase text-center tracking-[0.3em] mb-2">Detalhamento dos Contratos</p>
                    {group.loans.map(loan => (
                        <LoanCard 
                            key={loan.id}
                            loan={loan}
                            {...passThroughProps}
                            
                            // --- WRAPPERS DE EVENTOS (Correção de Bug UUID Undefined) ---
                            // O LoanCard emite (e: MouseEvent). O Controller espera (loan: Loan).
                            // Precisamos interceptar e passar o objeto 'loan' do loop.
                            
                            onEdit={(e) => { e?.stopPropagation(); passThroughProps.onEdit(loan); }}
                            onMessage={(e) => { e?.stopPropagation(); passThroughProps.onMessage(loan); }}
                            onNote={(e) => { e?.stopPropagation(); passThroughProps.onNote(loan); }}
                            
                            onArchive={(e) => { e?.stopPropagation(); passThroughProps.onArchive(loan); }}
                            onRestore={(e) => { e?.stopPropagation(); passThroughProps.onRestore(loan); }}
                            onDelete={(e) => { e?.stopPropagation(); passThroughProps.onDelete(loan); }}
                            
                            onPortalLink={(e) => { e?.stopPropagation(); passThroughProps.onPortalLink(loan); }}
                            onUploadPromissoria={(e) => { e?.stopPropagation(); passThroughProps.onUploadPromissoria(loan); }}
                            onUploadDoc={(e) => { e?.stopPropagation(); passThroughProps.onUploadDoc(loan); }}
                            onRenegotiate={() => { passThroughProps.onRenegotiate(loan); }}
                            onNewAporte={() => { passThroughProps.onNewAporte(loan); }}
                            
                            // Fix para visualizadores que recebem URL como 2º argumento
                            onViewPromissoria={(e, url) => { e?.stopPropagation(); passThroughProps.onViewPromissoria(url); }}
                            onViewDoc={(e, url) => { e?.stopPropagation(); passThroughProps.onViewDoc(url); }}

                            // -------------------------------------------------------------

                            // Força modo não expandido por padrão dentro do grupo
                            isExpanded={passThroughProps.selectedLoanId === loan.id}
                            // Toggle expand individual
                            onToggleExpand={(e) => {
                                e?.stopPropagation();
                                passThroughProps.setSelectedLoanId(passThroughProps.selectedLoanId === loan.id ? null : loan.id);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
