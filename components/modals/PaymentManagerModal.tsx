import React from 'react';
import { Loader2, MessageSquare, DollarSign, CheckSquare, RefreshCcw, Calendar, CalendarClock, AlertCircle, Banknote, CheckCircle2, TrendingUp, AlertTriangle, Clock, X, Receipt, ShieldCheck } from 'lucide-react';
import { Loan, Installment } from '../../types';
import { parseDateOnlyUTC } from '../../utils/dateHelpers';
import { FlexibleDailyScreen } from './payment/FlexibleDailyScreen';
import { usePaymentManagerState, ForgivenessMode } from './payment/hooks/usePaymentManagerState';
import { formatMoney } from '../../utils/formatters';

interface PaymentManagerModalProps {
    data: {loan: Loan, inst: Installment, calculations: any} | null;
    onClose: () => void;
    isProcessing: boolean;
    paymentType: 'FULL' | 'RENEW_INTEREST' | 'RENEW_AV' | 'LEND_MORE' | 'CUSTOM' | 'PARTIAL_INTEREST';
    setPaymentType: (t: any) => void;
    avAmount: string;
    setAvAmount: (v: string) => void;
    onConfirm: (
        forgivePenalty: ForgivenessMode, 
        manualDate?: Date | null, 
        customAmount?: number,
        realDate?: Date | null,
        interestHandling?: 'CAPITALIZE' | 'KEEP_PENDING'
    ) => void;
    onOpenMessage: (loan: Loan) => void;
}

export const PaymentManagerModal: React.FC<PaymentManagerModalProps> = ({ 
    data, onClose, isProcessing, paymentType, setPaymentType, avAmount, setAvAmount, onConfirm, onOpenMessage 
}) => {
    
    const {
        customAmount, setCustomAmount,
        manualDateStr, setManualDateStr,
        realPaymentDateStr, setRealPaymentDateStr,
        subMode, setSubMode,
        fixedTermData,
        forgivenessMode, setForgivenessMode,
        interestHandling, setInterestHandling,
        debtBreakdown,
        virtualSchedule
    } = usePaymentManagerState({ data, paymentType, setPaymentType, avAmount, setAvAmount });

    if (!data) return null;

    const { loan, calculations } = data;
    const isDailyFree = loan.billingCycle === 'DAILY_FREE' || loan.billingCycle === ('DAILY_FIXED' as any);
    const isFixedTerm = loan.billingCycle === 'DAILY_FIXED_TERM';

    const safeParse = (val: string) => {
        if (!val) return 0;
        const str = String(val).trim();
        if (str.includes('.') && str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
        if (str.includes(',')) return parseFloat(str.replace(',', '.')) || 0;
        return parseFloat(str) || 0;
    };

    // Cálculos de Display Baseados no Breakdown (Já com perdão aplicado)
    const totalInterestDue = debtBreakdown.interest + debtBreakdown.fine + debtBreakdown.dailyMora;
    
    let amountEntering = 0;
    if (paymentType === 'FULL') amountEntering = debtBreakdown.total;
    else if (paymentType === 'RENEW_INTEREST') amountEntering = totalInterestDue;
    else amountEntering = safeParse(avAmount);

    const remainingInterest = Math.max(0, totalInterestDue - amountEntering);
    
    // Regra: Mostrar decisão de sobra apenas se houver sobra significativa
    const showInterestDecision = 
        (paymentType === 'PARTIAL_INTEREST') || 
        (paymentType !== 'FULL' && paymentType !== 'LEND_MORE' && remainingInterest > 0.05);

    const handleConfirmWrapper = (forceFull: boolean = false) => {
        const typeToUse = forceFull ? 'FULL' : paymentType;
        const nextDueDate = manualDateStr ? parseDateOnlyUTC(manualDateStr) : null;
        
        // Data REAL do pagamento (auditável)
        const realPaymentDate = realPaymentDateStr ? parseDateOnlyUTC(realPaymentDateStr) : new Date();

        if (isDailyFree && typeToUse !== 'FULL') {
            const val = safeParse(customAmount);
            if (!val || val <= 0) return;
            if (subMode === 'AMORTIZE') {
                setPaymentType('RENEW_AV');
                setAvAmount(String(val));
                onConfirm(forgivenessMode, nextDueDate, 0, realPaymentDate, interestHandling);
            } else {
                onConfirm(forgivenessMode, nextDueDate, val, realPaymentDate, interestHandling);
            }
        } else {
            onConfirm(forgivenessMode, nextDueDate, undefined, realPaymentDate, interestHandling);
        }
    };

    // Tem multa ou mora original para perdoar?
    const hasOriginalFine = calculations.lateFee > 0;

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-300 font-sans h-[100dvh]">
            
            {/* HEADER SUPERIOR */}
            <div className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 sm:px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-900/50">
                        <DollarSign size={20}/>
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white uppercase tracking-wider leading-none">Recebimento</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{loan.debtorName}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2.5 bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-950/30 hover:border-rose-900 border border-slate-800 rounded-xl transition-all group">
                    <X size={18} className="group-hover:scale-110 transition-transform"/>
                </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                
                {/* COLUNA ESQUERDA: RESUMO E DETALHES (SIDEBAR) */}
                <div className="w-full md:w-[380px] lg:w-[420px] bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col md:overflow-y-auto custom-scrollbar p-6 shrink-0">
                    
                    {/* CARD PRINCIPAL DE VALOR */}
                    <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 text-center relative overflow-hidden shadow-2xl mb-6">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
                        <p className="text-xs font-black uppercase text-slate-500 mb-2 tracking-widest">Total a Receber</p>
                        <p className="text-4xl font-black text-white mb-2 tracking-tight">
                            {formatMoney(debtBreakdown.total)}
                        </p>
                        {forgivenessMode !== 'NONE' && (
                            <div className="inline-flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                                <span className="text-[10px] text-rose-400 font-bold line-through decoration-rose-500/50">
                                    Original: R$ {calculations.total.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* DETALHAMENTO DA DÍVIDA */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <Receipt size={14}/> Detalhamento Contábil
                        </h3>
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center text-xs border-b border-slate-800/50 pb-2">
                                <span className="text-slate-400 font-bold uppercase">Capital Principal</span>
                                <span className="text-white font-bold">{formatMoney(debtBreakdown.principal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-b border-slate-800/50 pb-2">
                                <span className="text-blue-400 font-bold uppercase flex items-center gap-1"><TrendingUp size={12}/> Lucro (Juros)</span>
                                <span className="text-blue-400 font-bold">{formatMoney(debtBreakdown.interest)}</span>
                            </div>
                            {(calculations.lateFee > 0) && (
                                <>
                                    <div className={`flex justify-between items-center text-xs ${forgivenessMode === 'FINE_ONLY' || forgivenessMode === 'BOTH' ? 'line-through opacity-50' : ''}`}>
                                        <span className="text-rose-400 font-bold uppercase flex items-center gap-1"><AlertTriangle size={12}/> Multa Fixa</span>
                                        <span className="text-rose-400 font-bold">{formatMoney(debtBreakdown.fine)}</span>
                                    </div>
                                    <div className={`flex justify-between items-center text-xs ${forgivenessMode === 'INTEREST_ONLY' || forgivenessMode === 'BOTH' ? 'line-through opacity-50' : ''}`}>
                                        <span className="text-orange-400 font-bold uppercase flex items-center gap-1"><Clock size={12}/> Juros Mora</span>
                                        <span className="text-orange-400 font-bold">{formatMoney(debtBreakdown.dailyMora)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between items-center text-sm pt-1">
                                <span className="text-slate-200 font-black uppercase">Total Final</span>
                                <span className="text-emerald-400 font-black">{formatMoney(debtBreakdown.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* OPÇÕES DE PERDÃO */}
                    {hasOriginalFine && paymentType !== 'FULL' && (
                        <div className="mt-6 space-y-3">
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                <ShieldCheck size={14}/> Gestão de Perdão
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => setForgivenessMode(forgivenessMode === 'FINE_ONLY' ? 'NONE' : 'FINE_ONLY')}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-bold uppercase border transition-all ${forgivenessMode === 'FINE_ONLY' ? 'bg-rose-500 text-white border-rose-600' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-rose-500'}`}
                                >
                                    Perdoar Multa
                                </button>
                                <button 
                                    onClick={() => setForgivenessMode(forgivenessMode === 'INTEREST_ONLY' ? 'NONE' : 'INTEREST_ONLY')}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-bold uppercase border transition-all ${forgivenessMode === 'INTEREST_ONLY' ? 'bg-orange-500 text-white border-orange-600' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-orange-500'}`}
                                >
                                    Perdoar Mora
                                </button>
                                <button 
                                    onClick={() => setForgivenessMode(forgivenessMode === 'BOTH' ? 'NONE' : 'BOTH')}
                                    className={`col-span-2 px-3 py-2 rounded-xl text-[9px] font-bold uppercase border transition-all ${forgivenessMode === 'BOTH' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-emerald-500'}`}
                                >
                                    Perdoar Total (100% Encargos)
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA: ÁREA DE AÇÃO (MAIN) */}
                <div className="flex-1 bg-slate-950 md:overflow-y-auto custom-scrollbar p-6">
                    <div className="max-w-2xl mx-auto space-y-8">
                        
                        {/* Seletor de Data Real (GLOBAL PARA TODOS OS TIPOS) */}
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center justify-between group focus-within:border-blue-500 transition-colors">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Data do Recebimento (Auditoria)</label>
                                <input 
                                    type="date" 
                                    value={realPaymentDateStr}
                                    onChange={e => setRealPaymentDateStr(e.target.value)}
                                    className="bg-transparent text-white font-bold text-sm outline-none w-full appearance-none cursor-pointer"
                                />
                            </div>
                            <Calendar size={20} className="text-slate-600 group-focus-within:text-blue-500 transition-colors"/>
                        </div>

                        {/* WORKSPACE PRINCIPAL */}
                        {isDailyFree ? (
                            <FlexibleDailyScreen 
                                amount={customAmount} setAmount={setCustomAmount}
                                manualDateStr={manualDateStr} setManualDateStr={setManualDateStr}
                                debt={calculations} loan={loan} subMode={subMode} setSetSubMode={setSubMode}
                                onConfirmFull={() => handleConfirmWrapper(true)}
                                paymentType={paymentType} setPaymentType={setPaymentType}
                            />
                        ) : (
                            <div className="space-y-4">
                                
                                {/* LISTA DE MENSALIDADES (CONTEXTO VISUAL) */}
                                {!isFixedTerm && virtualSchedule.length > 0 && (
                                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden mb-4">
                                        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-500"/>
                                            <span className="text-[10px] font-black uppercase text-slate-400">Mensalidades</span>
                                        </div>
                                        <div className="max-h-[160px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                            {virtualSchedule.map((item: any, idx: number) => {
                                                const isLate = item.status === 'LATE';
                                                const isFuture = item.status === 'FUTURE';
                                                
                                                let statusClass = 'bg-slate-900 text-slate-500 border-slate-700';
                                                if (isLate) statusClass = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
                                                if (isFuture) statusClass = 'bg-slate-800 text-slate-400 border-slate-700';
                                                if (item.status === 'OPEN') statusClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                                                if (item.status === 'PARTIAL') statusClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';

                                                return (
                                                    <div key={idx} className="flex justify-between items-center text-[10px] p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-1 h-8 rounded-full ${isLate ? 'bg-rose-500' : item.status === 'PARTIAL' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-white capitalize font-bold text-xs">
                                                                    {item.dateStr}
                                                                </span>
                                                                <span className="text-[9px] text-slate-500 font-mono">
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[9px] text-slate-500 block mb-0.5">Venc: {item.fullDate}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* LISTA DE MODALIDADES (CARDS EXPANSÍVEIS) */}
                                <div className="space-y-3">
                                    
                                    {/* 1. PAGAR JUROS (RENOVAR) */}
                                    {!isFixedTerm && (
                                        <div className={`rounded-2xl border transition-all overflow-hidden ${paymentType === 'RENEW_INTEREST' ? 'bg-slate-900 border-amber-500 ring-1 ring-amber-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                                            <button onClick={() => setPaymentType('RENEW_INTEREST')} className="w-full p-4 flex items-center gap-4 text-left">
                                                <div className={`p-3 rounded-xl ${paymentType === 'RENEW_INTEREST' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>
                                                    <RefreshCcw size={20}/>
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-bold uppercase ${paymentType === 'RENEW_INTEREST' ? 'text-white' : 'text-slate-300'}`}>Pagar Juros (Renovar)</p>
                                                    <p className="text-[10px] text-slate-500">Apenas o lucro do período</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-black text-amber-500">{formatMoney(totalInterestDue)}</span>
                                                </div>
                                            </button>
                                            
                                            {paymentType === 'RENEW_INTEREST' && (
                                                <div className="px-4 pb-4 pt-0 space-y-4 animate-in slide-in-from-top-2">
                                                    <div className="h-px bg-slate-800 w-full" />
                                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1 flex items-center gap-1">
                                                            <CalendarClock size={12}/> Próximo Vencimento
                                                        </label>
                                                        <input type="date" className="bg-transparent text-white font-bold text-sm outline-none w-full" value={manualDateStr} onChange={e => setManualDateStr(e.target.value)} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. JUROS + AMORTIZAÇÃO (RENEW_AV) */}
                                    <div className={`rounded-2xl border transition-all overflow-hidden ${paymentType === 'RENEW_AV' ? 'bg-slate-900 border-blue-500 ring-1 ring-blue-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                                        <button onClick={() => setPaymentType('RENEW_AV')} className="w-full p-4 flex items-center gap-4 text-left">
                                            <div className={`p-3 rounded-xl ${paymentType === 'RENEW_AV' ? 'bg-blue-500/20 text-blue-500' : 'bg-slate-800 text-slate-400'}`}>
                                                <DollarSign size={20}/>
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm font-bold uppercase ${paymentType === 'RENEW_AV' ? 'text-white' : 'text-slate-300'}`}>{isFixedTerm ? 'Abater Saldo / Pagar Diária' : 'Juros + Amortização'}</p>
                                                <p className="text-[10px] text-slate-500">Paga juros e abate principal</p>
                                            </div>
                                        </button>

                                        {paymentType === 'RENEW_AV' && (
                                            <div className="px-4 pb-4 pt-0 space-y-4 animate-in slide-in-from-top-2">
                                                <div className="h-px bg-slate-800 w-full" />
                                                
                                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Valor Total do Pagamento</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-xl text-blue-500">R$</span>
                                                        <input type="text" inputMode="decimal" value={avAmount} onChange={e => setAvAmount(e.target.value.replace(/[^0-9.,]/g, ''))} className="w-full bg-transparent text-white text-2xl font-black outline-none placeholder:text-slate-800" placeholder="0,00" autoFocus />
                                                    </div>
                                                </div>

                                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1 flex items-center gap-1">
                                                        <CalendarClock size={12}/> Próximo Vencimento
                                                    </label>
                                                    <input type="date" className="bg-transparent text-white font-bold text-sm outline-none w-full" value={manualDateStr} onChange={e => setManualDateStr(e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. PARCIAL (LUCRO) - NOVO BOTÃO SOLICITADO */}
                                    {!isFixedTerm && (
                                        <div className={`rounded-2xl border transition-all overflow-hidden ${paymentType === 'PARTIAL_INTEREST' ? 'bg-slate-900 border-purple-500 ring-1 ring-purple-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                                            <button onClick={() => { setPaymentType('PARTIAL_INTEREST'); setAvAmount(''); }} className="w-full p-4 flex items-center gap-4 text-left">
                                                <div className={`p-3 rounded-xl ${paymentType === 'PARTIAL_INTEREST' ? 'bg-purple-500/20 text-purple-500' : 'bg-slate-800 text-slate-400'}`}>
                                                    <Banknote size={20}/>
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-bold uppercase ${paymentType === 'PARTIAL_INTEREST' ? 'text-white' : 'text-slate-300'}`}>Pagamento Parcial (Só Juros)</p>
                                                    <p className="text-[10px] text-slate-500">Abate apenas juros, mantém principal e data</p>
                                                </div>
                                            </button>

                                            {paymentType === 'PARTIAL_INTEREST' && (
                                                <div className="px-4 pb-4 pt-0 space-y-4 animate-in slide-in-from-top-2">
                                                    <div className="h-px bg-slate-800 w-full" />
                                                    
                                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Valor Pago (Parcial)</label>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-xl text-purple-500">R$</span>
                                                            <input type="text" inputMode="decimal" value={avAmount} onChange={e => setAvAmount(e.target.value.replace(/[^0-9.,]/g, ''))} className="w-full bg-transparent text-white text-2xl font-black outline-none placeholder:text-slate-800" placeholder="0,00" autoFocus />
                                                        </div>
                                                    </div>

                                                    {/* Decisão sobre a sobra (Manter Pendente vs Capitalizar) */}
                                                    {showInterestDecision && (
                                                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                                            <div className="flex items-center gap-2 text-amber-400 mb-2">
                                                                <AlertCircle size={14} />
                                                                <p className="text-[10px] font-black uppercase">Saldo Juros Restante: {formatMoney(remainingInterest)}</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <label className={`cursor-pointer p-2 rounded-lg border flex items-center gap-2 ${interestHandling === 'KEEP_PENDING' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900 border-slate-800'}`}>
                                                                    <input type="radio" name="interestRulePart" checked={interestHandling === 'KEEP_PENDING'} onChange={() => setInterestHandling('KEEP_PENDING')} className="accent-blue-500"/>
                                                                    <span className="text-[9px] font-bold text-white">Manter Pendente</span>
                                                                </label>
                                                                <label className={`cursor-pointer p-2 rounded-lg border flex items-center gap-2 ${interestHandling === 'CAPITALIZE' ? 'bg-rose-600/20 border-rose-500' : 'bg-slate-900 border-slate-800'}`}>
                                                                    <input type="radio" name="interestRulePart" checked={interestHandling === 'CAPITALIZE'} onChange={() => setInterestHandling('CAPITALIZE')} className="accent-rose-500"/>
                                                                    <span className="text-[9px] font-bold text-white">Capitalizar</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 4. QUITAÇÃO TOTAL */}
                                    <div className={`rounded-2xl border transition-all overflow-hidden ${paymentType === 'FULL' ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                                        <button onClick={() => setPaymentType('FULL')} className="w-full p-4 flex items-center gap-4 text-left">
                                            <div className={`p-3 rounded-xl ${paymentType === 'FULL' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                                                <CheckSquare size={20}/>
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm font-bold uppercase ${paymentType === 'FULL' ? 'text-white' : 'text-slate-300'}`}>Quitação Total</p>
                                                <p className="text-[10px] text-slate-500">Encerra o contrato</p>
                                            </div>
                                        </button>
                                        {paymentType === 'FULL' && (
                                            <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2">
                                                <div className="h-px bg-slate-800 w-full mb-4" />
                                                <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
                                                    <CheckCircle2 size={24} className="text-emerald-500"/>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-emerald-400">Pronto para Encerrar</p>
                                                        <p className="text-xs text-slate-300">O valor total de <b>{formatMoney(debtBreakdown.total)}</b> será registrado e o contrato arquivado.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FOOTER DE AÇÃO */}
                    <div className="mt-8 pt-6 border-t border-slate-800 flex gap-4 sticky bottom-0 bg-slate-950 pb-2">
                        <button onClick={() => { onOpenMessage(loan); }} disabled={isProcessing} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-emerald-500 hover:border-emerald-500/30 transition-all">
                            <MessageSquare size={20}/>
                        </button>
                        <button 
                            onClick={() => handleConfirmWrapper(false)} 
                            disabled={isProcessing || (isDailyFree && paymentType !== 'FULL' && !customAmount) || ((paymentType === 'RENEW_AV' || paymentType === 'PARTIAL_INTEREST') && !avAmount)} 
                            className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-sm shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-600/20`}
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <><CheckCircle2 size={20}/> Confirmar Recebimento</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};