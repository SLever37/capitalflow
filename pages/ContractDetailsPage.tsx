
import React, { useState, useMemo, useEffect } from 'react';
import { 
    ChevronLeft, DollarSign, Calendar, Clock, TrendingUp, AlertTriangle, 
    CheckCircle2, Receipt, MessageSquare, ShieldCheck, Banknote, 
    FileText, Download, RefreshCcw, Loader2, ChevronRight, User
} from 'lucide-react';
import { Loan, Installment, LedgerEntry, UserProfile, CapitalSource } from '../types';
import { formatMoney } from '../utils/formatters';
import { parseDateOnlyUTC, todayDateOnlyUTC } from '../utils/dateHelpers';
import { loanEngine } from '../domain/loanEngine';
import { usePaymentManagerState, ForgivenessMode } from '../components/modals/payment/hooks/usePaymentManagerState';

interface ContractDetailsPageProps {
    loanId: string;
    loans: Loan[];
    sources: CapitalSource[];
    activeUser: UserProfile | null;
    onBack: () => void;
    onPayment: (
        forgivePenalty: ForgivenessMode, 
        manualDate?: Date | null, 
        amountPaid?: number,
        realDate?: Date | null,
        interestHandling?: 'CAPITALIZE' | 'KEEP_PENDING',
        contextOverride?: { loan: Loan, inst: Installment, calculations: any }
    ) => Promise<void>;
    isProcessing: boolean;
    onOpenMessage: (loan: Loan) => void;
    onRenegotiate: (loan: Loan) => void;
    onGenerateContract: (loan: Loan) => void;
    onExportExtrato: (loan: Loan) => void;
    isStealthMode: boolean;
}

export const ContractDetailsPage: React.FC<ContractDetailsPageProps> = ({
    loanId, loans, sources, activeUser, onBack, onPayment, isProcessing,
    onOpenMessage, onRenegotiate, onGenerateContract, onExportExtrato, isStealthMode
}) => {
    const loan = useMemo(() => loans.find(l => l.id === loanId), [loans, loanId]);

    const [avAmount, setAvAmount] = useState('');
    const [paymentType, setPaymentType] = useState<any>('RENEW_AV');

    // Mock calculations for usePaymentManagerState hook
    const data = useMemo(() => {
        if (!loan) return null;
        const bal = loanEngine.computeRemainingBalance(loan);
        return {
            loan,
            inst: loan.installments.find(i => i.status !== 'PAID') || loan.installments[0] || {} as Installment,
            calculations: {
                total: bal.totalRemaining,
                principal: bal.principalRemaining,
                interest: bal.interestRemaining,
                lateFee: bal.lateFeeRemaining
            }
        };
    }, [loan]);

    const {
        manualDateStr, setManualDateStr,
        realPaymentDateStr, setRealPaymentDateStr,
        forgivenessMode, setForgivenessMode,
        interestHandling, setInterestHandling,
        debtBreakdown
    } = usePaymentManagerState({ 
        data, 
        paymentType, 
        setPaymentType, 
        avAmount, 
        setAvAmount 
    });

    if (!loan) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 border border-slate-800">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <h3 className="text-white font-black uppercase tracking-tight">Carregando contrato...</h3>
            </div>
        );
    }

    const safeParse = (val: string) => {
        if (!val) return 0;
        const str = String(val).trim();
        if (str.includes('.') && str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
        if (str.includes(',')) return parseFloat(str.replace(',', '.')) || 0;
        return parseFloat(str) || 0;
    };

    const totalInterestDue = debtBreakdown.interest + debtBreakdown.fine + debtBreakdown.dailyMora;
    const amountEntering = safeParse(avAmount);
    const showInterestDecision = Math.max(0, totalInterestDue - amountEntering) > 0.05;

    const handleConfirm = () => {
        const val = safeParse(avAmount);
        if (val <= 0) return;
        const nextDueDate = manualDateStr ? parseDateOnlyUTC(manualDateStr) : null;
        const realPaymentDate = realPaymentDateStr ? parseDateOnlyUTC(realPaymentDateStr) : new Date();
        onPayment(forgivenessMode, nextDueDate, val, realPaymentDate, interestHandling, data || undefined);
    };

    const status = loanEngine.computeLoanStatus(loan);
    const statusColor = status === 'PAID' ? 'bg-emerald-500' : status === 'OVERDUE' ? 'bg-rose-500' : 'bg-blue-500';

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-24 md:pb-6">
            
            {/* TOPO FIXO / HEADER */}
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${statusColor}`}></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95"
                            title="Voltar"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-xl font-black text-white uppercase tracking-tight">{loan.debtorName}</h1>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black text-white uppercase tracking-widest ${statusColor}`}>
                                    {status === 'OVERDUE' ? 'Atrasado' : status === 'PAID' ? 'Quitado' : 'Ativo'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                <User size={12}/> {loan.debtorPhone}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:flex items-center gap-4 md:gap-8">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Principal</p>
                            <p className="text-lg font-black text-white">{formatMoney(loan.principal, isStealthMode)}</p>
                        </div>
                        <div className="space-y-1 text-right md:text-left">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Próximo Vencimento</p>
                            <p className="text-lg font-black text-blue-400">
                                {loan.installments.find(i => i.status !== 'PAID')?.dueDate ? new Date(loan.installments.find(i => i.status !== 'PAID')!.dueDate).toLocaleDateString('pt-BR') : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* COLUNA ESQUERDA: RESUMO + AÇÕES */}
                <div className="space-y-6">
                    
                    {/* SEÇÃO 1 — RESUMO FINANCEIRO */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 space-y-6">
                        <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <TrendingUp size={16} className="text-blue-500"/> Resumo Financeiro
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Principal Restante</p>
                                <p className="text-xl font-black text-white">{formatMoney(debtBreakdown.principal, isStealthMode)}</p>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Juros Acumulados</p>
                                <p className="text-xl font-black text-blue-400">{formatMoney(debtBreakdown.interest, isStealthMode)}</p>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Multa/Mora</p>
                                <p className="text-xl font-black text-rose-400">{formatMoney(debtBreakdown.fine + debtBreakdown.dailyMora, isStealthMode)}</p>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl ring-2 ring-emerald-500/20">
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Atual</p>
                                <p className="text-xl font-black text-emerald-400">{formatMoney(debtBreakdown.total, isStealthMode)}</p>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 4 — AÇÕES RÁPIDAS */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <ShieldCheck size={16} className="text-purple-500"/> Ações do Contrato
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button onClick={() => onRenegotiate(loan)} className="flex items-center justify-center gap-2 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:border-blue-500 transition-all">
                                <RefreshCcw size={16}/> Renegociar
                            </button>
                            <button onClick={() => onGenerateContract(loan)} className="flex items-center justify-center gap-2 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:border-emerald-500 transition-all">
                                <FileText size={16}/> Gerar Contrato
                            </button>
                            <button onClick={() => onExportExtrato(loan)} className="flex items-center justify-center gap-2 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:border-amber-500 transition-all">
                                <Download size={16}/> Exportar Extrato
                            </button>
                        </div>
                    </div>

                    {/* SEÇÃO 2 — HISTÓRICO DE PAGAMENTOS */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 space-y-6">
                        <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <Clock size={16} className="text-amber-500"/> Histórico de Transações
                        </h3>
                        
                        <div className="space-y-3">
                            {loan.ledger && loan.ledger.length > 0 ? (
                                loan.ledger.slice().reverse().map((entry: LedgerEntry) => (
                                    <div key={entry.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-emerald-500 border border-slate-800">
                                                <DollarSign size={18}/>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white uppercase tracking-tight">{entry.type}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(entry.date).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-emerald-400">{formatMoney(entry.amount, isStealthMode)}</p>
                                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Confirmado</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Nenhuma transação registrada</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUNA DIREITA: PAGAMENTO */}
                <div className="space-y-6">
                    
                    {/* SEÇÃO 3 — REGISTRAR PAGAMENTO */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group focus-within:border-blue-500 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[60px] rounded-full"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                    <Banknote size={16} className="text-blue-500"/>
                                    Registrar Pagamento
                                </h2>
                                <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detecção Automática</span>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-4 mb-8">
                                <span className="text-4xl font-black text-blue-500">R$</span>
                                <input 
                                    type="text" 
                                    inputMode="decimal" 
                                    value={avAmount || ''} 
                                    onChange={e => setAvAmount(e.target.value.replace(/[^0-9.,]/g, ''))} 
                                    className="w-full bg-transparent text-6xl font-black text-white outline-none placeholder:text-slate-800 tracking-tighter" 
                                    placeholder="0,00" 
                                />
                            </div>

                            {/* PREVIEW DINÂMICO */}
                            {safeParse(avAmount) > 0 && (
                                <div className="bg-slate-950/50 border border-slate-800/50 p-6 rounded-3xl space-y-4 animate-in zoom-in-95 duration-300 mb-8">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                                            <TrendingUp size={20}/>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Impacto do Recebimento</p>
                                            <p className="text-sm text-slate-200 font-bold leading-relaxed">
                                                {(() => {
                                                    const val = safeParse(avAmount);
                                                    const totalDue = debtBreakdown.total;
                                                    const interestDue = totalInterestDue;
                                                    
                                                    if (val >= totalDue - 0.05) return "Quitação total: O contrato será encerrado e arquivado.";
                                                    if (val >= interestDue - 0.05) {
                                                        const amort = val - interestDue;
                                                        if (amort > 0.05) return `Encargos + Amortização: Quita os juros e abate ${formatMoney(amort)} do capital principal.`;
                                                        return "Renovação: Quita os juros/multas do período e mantém o capital principal.";
                                                    }
                                                    return `Pagamento Parcial: Abate ${formatMoney(val)} apenas dos juros/encargos acumulados.`;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-500 block tracking-widest">Data Recebimento</label>
                                    <input 
                                        type="date" 
                                        value={realPaymentDateStr}
                                        onChange={e => setRealPaymentDateStr(e.target.value)}
                                        className="bg-transparent text-white font-bold text-sm outline-none w-full appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-500 block tracking-widest">Próximo Vencimento</label>
                                    <input 
                                        type="date" 
                                        value={manualDateStr || ''}
                                        onChange={e => setManualDateStr(e.target.value)}
                                        className="bg-transparent text-white font-bold text-sm outline-none w-full appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            {showInterestDecision && (
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-8 space-y-3">
                                    <label className="text-[9px] font-black uppercase text-slate-500 block tracking-widest">Saldo de Juros Restante</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => setInterestHandling('KEEP_PENDING')}
                                            className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all ${interestHandling === 'KEEP_PENDING' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                                        >
                                            Manter Pendente
                                        </button>
                                        <button 
                                            onClick={() => setInterestHandling('CAPITALIZE')}
                                            className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all ${interestHandling === 'CAPITALIZE' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                                        >
                                            Capitalizar
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleConfirm} 
                                disabled={isProcessing || !avAmount || safeParse(avAmount) <= 0} 
                                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <><CheckCircle2 size={20}/> Confirmar Recebimento</>}
                            </button>
                        </div>
                    </div>

                    {/* ATALHOS RÁPIDOS MOBILE */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        <button onClick={() => onOpenMessage(loan)} className="flex items-center justify-center gap-2 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400">
                            <MessageSquare size={16}/> WhatsApp
                        </button>
                    </div>
                </div>
            </div>

            {/* BOTÃO FIXO MOBILE (OPCIONAL) */}
            <div className="md:hidden fixed bottom-0 left-0 w-full p-4 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 z-50">
                <button 
                    onClick={() => {
                        const el = document.querySelector('input[inputMode="decimal"]');
                        if (el) (el as HTMLInputElement).focus();
                    }}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm shadow-lg"
                >
                    Registrar Pagamento
                </button>
            </div>
        </div>
    );
};
