
import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, MessageSquare, DollarSign, CheckSquare, RefreshCcw, CalendarClock, Clock, Calendar, ArrowRightLeft, Target, Info, Coins } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Loan, Installment } from '../../types';
import { paymentModalityDispatcher } from '../../features/payments/modality/index';
import { parseDateOnlyUTC, toISODateOnlyUTC, formatBRDate, addDaysUTC, getDaysDiff, todayDateOnlyUTC } from '../../utils/dateHelpers';

interface PaymentManagerModalProps {
    data: {loan: Loan, inst: Installment, calculations: any} | null;
    onClose: () => void;
    isProcessing: boolean;
    paymentType: 'FULL' | 'RENEW_INTEREST' | 'RENEW_AV' | 'LEND_MORE' | 'CUSTOM';
    setPaymentType: (t: any) => void;
    avAmount: string;
    setAvAmount: (v: string) => void;
    onConfirm: (forgivePenalty: boolean, manualDate?: Date | null, customAmount?: number) => void;
    onOpenMessage: (loan: Loan) => void;
}

const FlexibleDailyScreen = ({ 
    amount, setAmount, manualDateStr, setManualDateStr, debt, loan, subMode, setSetSubMode, onConfirmFull, paymentType, setPaymentType
}: any) => {
    
    // VISUAL DE QUITAÇÃO (Quando selecionado)
    if (paymentType === 'FULL') {
        return (
             <div className="space-y-5 animate-in slide-in-from-right">
                <div className="bg-emerald-950/30 border border-emerald-500/30 p-6 rounded-2xl text-center">
                    <CheckSquare size={48} className="mx-auto text-emerald-500 mb-4"/>
                    <h3 className="text-xl font-black text-white uppercase mb-2">Quitação Total Selecionada</h3>
                    <p className="text-emerald-400 font-bold text-2xl">R$ {debt.total.toFixed(2)}</p>
                    <button onClick={() => setPaymentType('CUSTOM')} className="mt-4 text-xs font-bold text-slate-400 hover:text-white underline">Cancelar e voltar para parcial</button>
                </div>
             </div>
        );
    }

    const dailyRate = (loan.interestRate / 100) / 30;
    const dailyCost = debt.principal * dailyRate;
    const daysPaid = dailyCost > 0 ? Math.floor(parseFloat(amount || '0') / dailyCost) : 0;

    const baseDateStr =
      loan.billingCycle === 'DAILY_FREE'
        ? (loan.startDate || loan.installments?.[0]?.dueDate)
        : (loan.installments?.[0]?.dueDate);

    const currentDueDate = parseDateOnlyUTC(baseDateStr);
    const projectedDate = daysPaid > 0 ? addDaysUTC(currentDueDate, daysPaid, false) : currentDueDate;

    return (
        <div className="space-y-5 animate-in slide-in-from-right">
            {/* Seletor de Tipo de Recebimento */}
            <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button 
                    onClick={() => setSetSubMode('DAYS')} 
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${subMode === 'DAYS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                    <Clock size={14}/> Pagar Diária
                </button>
                <button 
                    onClick={() => setSetSubMode('AMORTIZE')} 
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${subMode === 'AMORTIZE' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                    <Target size={14}/> Amortizar Capital
                </button>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Valor Recebido</label>
                    <button 
                        onClick={onConfirmFull}
                        className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1"
                    >
                        <CheckSquare size={12}/> Quitar agora: R$ {debt.total.toFixed(2)}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-2xl text-emerald-500 font-black">R$</span>
                    <input 
                        type="number" 
                        step="0.01" 
                        className="w-full bg-transparent text-3xl font-black text-white outline-none placeholder:text-slate-700"
                        placeholder="0.00"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {subMode === 'DAYS' && parseFloat(amount) > 0 && (
                <div className="bg-blue-900/10 border border-blue-500/30 p-4 rounded-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-blue-400 uppercase">Avanço do Contrato</span>
                        <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">+{daysPaid} DIAS</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <p className="text-[9px] text-slate-500 font-bold uppercase">Vencimento Atual</p>
                            <p className="text-sm font-bold text-white opacity-50 line-through">{formatBRDate(currentDueDate)}</p>
                        </div>
                        <ArrowRightLeft size={16} className="text-blue-500"/>
                        <div className="flex-1 text-right">
                            <p className="text-[9px] text-blue-400 font-black uppercase">Novo "Pago Até"</p>
                            <p className="text-base font-black text-white">{formatBRDate(projectedDate)}</p>
                        </div>
                    </div>
                </div>
            )}

            {subMode === 'AMORTIZE' && parseFloat(amount) > 0 && (
                <div className="bg-purple-900/10 border border-purple-500/30 p-4 rounded-2xl animate-in zoom-in-95">
                    <p className="text-[10px] font-black text-purple-400 uppercase mb-2">Resultado da Amortização</p>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">Capital Atual</p>
                            <p className="text-sm font-bold text-white">R$ {debt.principal.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-purple-400 font-black uppercase">Saldo Restante</p>
                            <p className="text-lg font-black text-white">R$ {Math.max(0, debt.principal - parseFloat(amount)).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between group focus-within:border-blue-500 transition-colors">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1 flex items-center gap-1"><CalendarClock size={12}/> Avançar Data Manualmente</label>
                    <input 
                        type="date" 
                        className="bg-transparent text-white font-bold text-sm outline-none w-full"
                        value={manualDateStr}
                        onChange={e => setManualDateStr(e.target.value)}
                    />
                </div>
                <div className="p-2 bg-slate-800 rounded-xl text-blue-500 group-focus-within:text-white transition-colors">
                    <Calendar size={18}/>
                </div>
            </div>

            {!manualDateStr && <p className="text-[8px] text-center text-slate-500 uppercase font-black tracking-widest">O sistema empurrará o vencimento automaticamente baseado no valor pago.</p>}
        </div>
    );
};

export const PaymentManagerModal: React.FC<PaymentManagerModalProps> = ({ 
    data, onClose, isProcessing, paymentType, setPaymentType, avAmount, setAvAmount, onConfirm, onOpenMessage 
}) => {
    const [customAmount, setCustomAmount] = useState('');
    const [manualDateStr, setManualDateStr] = useState('');
    const [subMode, setSubMode] = useState<'DAYS' | 'AMORTIZE'>('DAYS');

    // Cálculo do valor diário teórico para Fixed Term
    const fixedTermData = useMemo(() => {
        if (data?.loan?.billingCycle === 'DAILY_FIXED_TERM') {
            const start = parseDateOnlyUTC(data.loan.startDate);
            const due = parseDateOnlyUTC(data.inst.dueDate);
            const days = Math.round((due.getTime() - start.getTime()) / 86400000);
            const safeDays = days > 0 ? days : 1; 
            const dailyVal = (data.loan.totalToReceive || 0) / safeDays;

            // Calcular o "Pago Até" Atual e Dias Pagos
            const currentDebt = (data.inst.principalRemaining || 0) + (data.inst.interestRemaining || 0);
            const amountPaid = Math.max(0, (data.loan.totalToReceive || 0) - currentDebt);
            
            // Adiciona tolerância (0.1) para evitar que dízimas periódicas ocultem o último dia
            const paidDays = dailyVal > 0 ? Math.floor((amountPaid + 0.1) / dailyVal) : 0;
            const paidUntil = addDaysUTC(start, paidDays);

            return { dailyVal, paidUntil, totalDays: safeDays, paidDays, currentDebt };
        }
        return { dailyVal: 0, paidUntil: todayDateOnlyUTC(), totalDays: 0, paidDays: 0, currentDebt: 0 };
    }, [data]);

    useEffect(() => {
        if (data) {
            if (data.loan.billingCycle === 'DAILY_FREE' || data.loan.billingCycle === ('DAILY_FIXED' as any)) {
                setPaymentType('CUSTOM');
                setManualDateStr('');
                setSubMode('DAYS');
            } else if (data.loan.billingCycle === 'DAILY_FIXED_TERM') {
                setPaymentType('RENEW_AV');
                // Sugere o valor da diária se o campo estiver vazio
                if (!avAmount && fixedTermData.dailyVal > 0) {
                    setAvAmount(fixedTermData.dailyVal.toFixed(2));
                }
            } else {
                setPaymentType(paymentModalityDispatcher.getConfig(data.loan).defaultAction);
            }
            if(data.loan.billingCycle !== 'DAILY_FIXED_TERM') setAvAmount('');
            setCustomAmount('');
        }
    }, [data, setPaymentType, setAvAmount, fixedTermData.dailyVal]);

    if (!data) return null;

    const { loan, calculations } = data;
    const isDailyFree = loan.billingCycle === 'DAILY_FREE' || loan.billingCycle === ('DAILY_FIXED' as any);
    const isFixedTerm = loan.billingCycle === 'DAILY_FIXED_TERM';

    const handleConfirmWrapper = (forceFull: boolean = false) => {
        if (forceFull) {
            setPaymentType('FULL');
            // Nota: Se forçado via UI, apenas setamos o state. O usuário clica no confirm.
            return;
        }

        // Se for DAILY_FREE e o tipo NÃO for FULL, usa a lógica de input manual.
        // Se o tipo for FULL, ignora e deixa passar para o onConfirm(false) padrão.
        if (isDailyFree && paymentType !== 'FULL') {
            const val = parseFloat(customAmount);
            if (!val || val <= 0) return;
            const date = manualDateStr ? parseDateOnlyUTC(manualDateStr) : null;

            if (subMode === 'AMORTIZE') {
                setPaymentType('RENEW_AV');
                setAvAmount(String(val));
                onConfirm(false, date, 0);
            } else {
                onConfirm(false, date, val);
            }
        } else {
            onConfirm(false);
        }
    };

    // Helper para botões rápidos do Fixed Term
    const setFixedTermPayment = (daysToPay: number) => {
        if (fixedTermData.dailyVal > 0) {
            let val = fixedTermData.dailyVal * daysToPay;
            const remainingDays = fixedTermData.totalDays - fixedTermData.paidDays;
            if (daysToPay >= remainingDays || Math.abs(val - fixedTermData.currentDebt) < 0.50) {
                val = fixedTermData.currentDebt;
            }
            setAvAmount(val.toFixed(2));
        }
    };

    return (
        <Modal onClose={onClose} title="Gerenciar Recebimento">
            <div className="space-y-6">
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
                    <p className="text-xs font-black uppercase text-slate-500 mb-2">Saldo Devedor Atual</p>
                    <p className="text-4xl font-black text-white mb-2">R$ {calculations.total.toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">ID Contrato: {loan.id.slice(0,8)}</p>
                </div>

                {isDailyFree ? (
                    <FlexibleDailyScreen 
                        amount={customAmount} 
                        setAmount={setCustomAmount}
                        manualDateStr={manualDateStr}
                        setManualDateStr={setManualDateStr}
                        debt={calculations}
                        loan={loan}
                        subMode={subMode}
                        setSetSubMode={setSubMode}
                        onConfirmFull={() => handleConfirmWrapper(true)}
                        paymentType={paymentType}
                        setPaymentType={setPaymentType}
                    />
                ) : (
                    <div className="space-y-3">
                        {isFixedTerm && fixedTermData.dailyVal > 0 && (
                            <div className="space-y-3">
                                {/* SIMULAÇÃO DE AVANÇO (Fixed Term) - Mantido */}
                                {avAmount && parseFloat(avAmount) > 0 && (
                                    <div className="bg-blue-900/10 border border-blue-500/30 p-4 rounded-2xl animate-in zoom-in-95">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-blue-400 uppercase">Projeção</span>
                                            <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                                +{Math.floor((parseFloat(avAmount) + 0.1) / fixedTermData.dailyVal)} DIAS
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <p className="text-[9px] text-slate-500 font-bold uppercase">Pago Até Hoje</p>
                                                <p className="text-sm font-bold text-white opacity-50">{formatBRDate(fixedTermData.paidUntil)}</p>
                                            </div>
                                            <ArrowRightLeft size={16} className="text-blue-500"/>
                                            <div className="flex-1 text-right">
                                                <p className="text-[9px] text-blue-400 font-black uppercase">Novo "Pago Até"</p>
                                                <p className="text-base font-black text-white">
                                                    {formatBRDate(addDaysUTC(fixedTermData.paidUntil, Math.floor((parseFloat(avAmount) + 0.1) / fixedTermData.dailyVal)))}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl flex items-center gap-3">
                                    <Info size={16} className="text-blue-400 shrink-0"/>
                                    <p className="text-xs text-blue-200">
                                        <span className="font-bold uppercase text-[10px] text-blue-400 block">Valor da Diária (Referência)</span>
                                        R$ {fixedTermData.dailyVal.toFixed(2)}
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setFixedTermPayment(1)} className="p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-blue-500 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-white">
                                        <Coins size={14}/> 1 Diária
                                    </button>
                                    <button onClick={() => setFixedTermPayment(2)} className="p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-blue-500 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-white">
                                        <Coins size={14}/> 2 Diárias
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isFixedTerm && (
                            <button onClick={() => setPaymentType('RENEW_INTEREST')} className={`w-full p-4 rounded-2xl border transition-all flex justify-between items-center ${paymentType === 'RENEW_INTEREST' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                                <div className="text-left"><p className="font-black uppercase text-xs flex items-center gap-2"><RefreshCcw size={14}/> Pagar Juros (Renovar)</p></div>
                            </button>
                        )}
                        
                        <button onClick={() => setPaymentType('RENEW_AV')} className={`w-full p-4 rounded-2xl border transition-all flex justify-between items-center ${paymentType === 'RENEW_AV' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                            <div className="text-left"><p className="font-black uppercase text-xs flex items-center gap-2"><DollarSign size={14}/> {isFixedTerm ? 'Abater Saldo / Pagar Diária' : 'Juros + Amortização (AV)'}</p></div>
                        </button>
                        
                        {/* BOTÃO DE QUITAÇÃO TOTAL: Agora apenas seleciona o modo */}
                        <button onClick={() => setPaymentType('FULL')} className={`w-full p-4 rounded-2xl border transition-all flex justify-between items-center ${paymentType === 'FULL' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                            <div className="text-left"><p className="font-black uppercase text-xs flex items-center gap-2"><CheckSquare size={14}/> Quitação Total</p></div>
                        </button>

                        {/* Input Valor para AV ou Partial */}
                        {paymentType === 'RENEW_AV' && (
                            <div className="animate-in slide-in-from-top-2 bg-slate-900 p-4 rounded-2xl border border-slate-800 mt-2">
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Valor a pagar</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-bold">R$</span>
                                    <input type="number" step="0.01" value={avAmount} onChange={e => setAvAmount(e.target.value)} disabled={isProcessing} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-bold outline-none focus:border-blue-500 transition-colors" placeholder="0.00" autoFocus />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button onClick={() => { onOpenMessage(loan); onClose(); }} disabled={isProcessing} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-emerald-500 transition-all"><MessageSquare/></button>
                    <button 
                        onClick={() => handleConfirmWrapper(false)} 
                        disabled={isProcessing || (isDailyFree && paymentType !== 'FULL' && !customAmount) || (paymentType === 'RENEW_AV' && !avAmount)} 
                        className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-xs shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${subMode === 'AMORTIZE' && paymentType !== 'FULL' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                    >
                        {isProcessing ? <Loader2 className="animate-spin"/> : <><DollarSign size={16}/> Confirmar Pagamento</>}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
