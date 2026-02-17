import React from 'react';
import { Loader2, MessageSquare, DollarSign, CheckSquare, RefreshCcw, Calendar, CalendarClock, AlertCircle, Banknote, CheckCircle2, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { Modal } from '../ui/Modal';
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
    
    const showInterestDecision = 
        (paymentType === 'PARTIAL_INTEREST') || 
        (paymentType !== 'FULL' && paymentType !== 'LEND_MORE' && remainingInterest > 0.05);

    const handleConfirmWrapper = (forceFull: boolean = false) => {
        const typeToUse = forceFull ? 'FULL' : paymentType;
        const nextDueDate = manualDateStr ? parseDateOnlyUTC(manualDateStr) : null;
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
        <Modal onClose={onClose} title="Gerenciar Recebimento">
            <div className="space-y-6">
                
                {/* Header Saldo */}
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
                    <p className="text-xs font-black uppercase text-slate-500 mb-2">Total a Receber</p>
                    <p className="text-4xl font-black text-white mb-2">
                        {formatMoney(debtBreakdown.total)}
                    </p>
                    {forgivenessMode !== 'NONE' && (
                        <p className="text-[10px] text-emerald-500 font-bold line-through decoration-slate-500">
                            Original: R$ {calculations.total.toFixed(2)}
                        </p>
                    )}
                </div>

                {/* DETALHAMENTO DA DÍVIDA (Solicitação 3) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase">Capital Principal</span>
                        <span className="text-white font-bold">{formatMoney(debtBreakdown.principal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
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
                    <div className="border-t border-slate-800 my-2"></div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-200 font-black uppercase">Total Final</span>
                        <span className="text-emerald-400 font-black">{formatMoney(debtBreakdown.total)}</span>
                    </div>
                </div>

                {/* Seletor de Data Real */}
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                        <Calendar size={14}/> Data do Pagamento
                    </label>
                    <input 
                        type="date" 
                        value={realPaymentDateStr}
                        onChange={e => setRealPaymentDateStr(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-blue-500"
                    />
                </div>

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
                        <div className="space-y-2">
                            {!isFixedTerm && (
                                <button onClick={() => setPaymentType('RENEW_INTEREST')} className={`w-full p-4 rounded-2xl border transition-all flex justify-between items-center ${paymentType === 'RENEW_INTEREST' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                                    <div className="text-left"><p className="font-black uppercase text-xs flex items-center gap-2"><RefreshCcw size={14}/> Pagar Juros (Renovar)</p></div>
                                    <span className="text-xs font-bold">{formatMoney(totalInterestDue)}</span>
                                </button>
                            )}
                            
                            <button onClick={() => setPaymentType('RENEW_AV')} className={`w-full p-4 rounded-2xl border transition-all flex justify-between items-center ${paymentType === 'RENEW_AV' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                                <div className="text-left"><p className="font-black uppercase text-xs flex items-center gap-2"><DollarSign size={14}/> {isFixedTerm ? 'Abater Saldo / Pagar Diária' : 'Juros + Amortização (AV)'}</p></div>
                            </button>

                            <button onClick={() => setPaymentType('FULL')} className={`w-full p-4 rounded-2xl border transition-all flex justify-between items-center ${paymentType === 'FULL' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                                <div className="text-left"><p className="font-black uppercase text-xs flex items-center gap-2"><CheckSquare size={14}/> Quitação Total</p></div>
                            </button>

                            {!isFixedTerm && (
                                <button onClick={() => { setPaymentType('PARTIAL_INTEREST'); setAvAmount(''); }} className={`w-full p-4 rounded-2xl border transition-all flex justify-between items-center ${paymentType === 'PARTIAL_INTEREST' ? 'bg-purple-500/10 border-purple-500 text-purple-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                                    <div className="text-left"><p className="font-black uppercase text-xs flex items-center gap-2"><Banknote size={14}/> Pagamento Parcial (Lucro)</p></div>
                                </button>
                            )}
                        </div>

                        {(paymentType === 'RENEW_AV' || paymentType === 'PARTIAL_INTEREST') && (
                            <div className="animate-in slide-in-from-top-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-1">
                                    {paymentType === 'RENEW_AV' ? 'Valor Total do Pagamento' : 'Valor Pago (Parcial)'}
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className={`font-black text-2xl ${paymentType === 'PARTIAL_INTEREST' ? 'text-purple-500' : 'text-emerald-500'}`}>R$</span>
                                    <input type="text" inputMode="decimal" value={avAmount} onChange={e => setAvAmount(e.target.value.replace(/[^0-9.,]/g, ''))} className="w-full bg-transparent text-white text-2xl font-black outline-none placeholder:text-slate-800" placeholder="0,00" autoFocus />
                                </div>
                            </div>
                        )}
                        
                        {/* OPÇÕES DE PERDÃO GRANULARES (Solicitação 2) */}
                        {hasOriginalFine && paymentType !== 'FULL' && (
                            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
                                <p className="text-[9px] font-black uppercase text-slate-500 pl-1">Opções de Perdão</p>
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={() => setForgivenessMode(forgivenessMode === 'FINE_ONLY' ? 'NONE' : 'FINE_ONLY')}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all ${forgivenessMode === 'FINE_ONLY' ? 'bg-rose-500 text-white border-rose-600' : 'bg-slate-950 text-slate-400 border-slate-700'}`}
                                    >
                                        Multa Fixa
                                    </button>
                                    <button 
                                        onClick={() => setForgivenessMode(forgivenessMode === 'INTEREST_ONLY' ? 'NONE' : 'INTEREST_ONLY')}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all ${forgivenessMode === 'INTEREST_ONLY' ? 'bg-orange-500 text-white border-orange-600' : 'bg-slate-950 text-slate-400 border-slate-700'}`}
                                    >
                                        Mora Diária
                                    </button>
                                    <button 
                                        onClick={() => setForgivenessMode(forgivenessMode === 'BOTH' ? 'NONE' : 'BOTH')}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all ${forgivenessMode === 'BOTH' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-950 text-slate-400 border-slate-700'}`}
                                    >
                                        Perdoar Tudo
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* LISTA DE MENSALIDADES VIRTUAIS (Solicitação 1 - Disponível em todos os modos) */}
                        {!isFixedTerm && virtualSchedule.length > 0 && (
                            <div className="mt-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800/50 max-h-[160px] overflow-y-auto custom-scrollbar">
                                <p className="text-[9px] font-black uppercase text-slate-500 mb-2 sticky top-0 bg-slate-900/95 backdrop-blur-sm py-1 z-10 flex items-center gap-1">
                                    <Calendar size={10}/> Posição das Mensalidades (Atraso)
                                </p>
                                <div className="space-y-1.5">
                                    {virtualSchedule.map((item: any, idx: number) => {
                                        const isLate = item.daysDiff > 0;
                                        return (
                                            <div key={idx} className="flex justify-between items-center text-[10px] p-2 bg-slate-950 border border-slate-800 rounded-lg">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 capitalize font-bold">
                                                        {item.date.toLocaleDateString('pt-BR', { month: 'long', year: '2-digit' })}
                                                    </span>
                                                    <span className="text-[8px] text-slate-600 font-mono">
                                                        Venc: {item.date.toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded ${isLate ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800 text-slate-500'}`}>
                                                    {isLate ? `${item.daysDiff}d Atraso` : 'Em Aberto'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Regra de Pagamento Parcial de Juros */}
                        {showInterestDecision && (
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 space-y-2 animate-in fade-in">
                                <div className="flex items-center gap-2 text-amber-400 mb-1">
                                    <AlertCircle size={14} />
                                    <p className="text-[10px] font-black uppercase">
                                        Saldo de Juros Restante: {formatMoney(remainingInterest)}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors">
                                        <input type="radio" name="interestRule" checked={interestHandling === 'KEEP_PENDING'} onChange={() => setInterestHandling('KEEP_PENDING')} className="accent-blue-500"/>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-200">Manter como Pendente</span>
                                            <span className="text-[9px] text-slate-500">Cobrar depois (Acumula no saldo)</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors">
                                        <input type="radio" name="interestRule" checked={interestHandling === 'CAPITALIZE'} onChange={() => setInterestHandling('CAPITALIZE')} className="accent-rose-500"/>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-200">Capitalizar (Somar ao Principal)</span>
                                            <span className="text-[9px] text-slate-500">Vira dívida de capital (Gera juros)</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Próximo Vencimento (Manual) */}
                        {paymentType !== 'FULL' && (
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between group focus-within:border-blue-500 transition-colors">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1 flex items-center gap-1"><CalendarClock size={12}/> Próximo Vencimento</label>
                                    <input type="date" className="bg-transparent text-white font-bold text-sm outline-none w-full appearance-none cursor-pointer" value={manualDateStr} onChange={e => setManualDateStr(e.target.value)} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button onClick={() => { onOpenMessage(loan); }} disabled={isProcessing} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-emerald-500 transition-all"><MessageSquare/></button>
                    <button onClick={() => handleConfirmWrapper(false)} disabled={isProcessing || (isDailyFree && paymentType !== 'FULL' && !customAmount) || ((paymentType === 'RENEW_AV' || paymentType === 'PARTIAL_INTEREST') && !avAmount)} className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-xs shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500`}>
                        {isProcessing ? <Loader2 className="animate-spin"/> : <><DollarSign size={16}/> Confirmar Pagamento</>}
                    </button>
                </div>
            </div>
        </Modal>
    );
};