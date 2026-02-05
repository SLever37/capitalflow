
import React from 'react';
import { Loader2, MessageSquare, DollarSign, CheckSquare, RefreshCcw, ArrowRightLeft, Info, Coins } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Loan, Installment } from '../../types';
import { parseDateOnlyUTC, formatBRDate, addDaysUTC } from '../../utils/dateHelpers';
import { FlexibleDailyScreen } from './payment/FlexibleDailyScreen';
import { usePaymentManagerState } from './payment/hooks/usePaymentManagerState';

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

export const PaymentManagerModal: React.FC<PaymentManagerModalProps> = ({ 
    data, onClose, isProcessing, paymentType, setPaymentType, avAmount, setAvAmount, onConfirm, onOpenMessage 
}) => {
    
    const {
        customAmount, setCustomAmount,
        manualDateStr, setManualDateStr,
        subMode, setSubMode,
        fixedTermData
    } = usePaymentManagerState({ data, paymentType, setPaymentType, avAmount, setAvAmount });

    if (!data) return null;

    const { loan, calculations } = data;
    const isDailyFree = loan.billingCycle === 'DAILY_FREE' || loan.billingCycle === ('DAILY_FIXED' as any);
    const isFixedTerm = loan.billingCycle === 'DAILY_FIXED_TERM';

    // Helper para Parsing Seguro (Mesma lógica do FlexibleDailyScreen)
    const safeParse = (val: string) => {
        if (!val) return 0;
        const str = String(val).trim();
        if (str.includes('.') && str.includes(',')) {
            return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
        }
        if (str.includes(',')) {
            return parseFloat(str.replace(',', '.')) || 0;
        }
        return parseFloat(str) || 0;
    };

    const handleConfirmWrapper = (forceFull: boolean = false) => {
        if (forceFull) {
            setPaymentType('FULL');
            return;
        }

        if (isDailyFree && paymentType !== 'FULL') {
            const val = safeParse(customAmount);
            if (!val || val <= 0) return;
            const date = manualDateStr ? parseDateOnlyUTC(manualDateStr) : null;

            if (subMode === 'AMORTIZE') {
                setPaymentType('RENEW_AV');
                setAvAmount(String(val));
                onConfirm(false, date, 0); // 0 no customAmount pois vai via avAmount
            } else {
                onConfirm(false, date, val);
            }
        } else {
            onConfirm(false);
        }
    };

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
                    <p className="text-4xl font-black text-white mb-2">R$ {Number(calculations.total).toFixed(2)}</p>
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
                                {avAmount && safeParse(avAmount) > 0 && (
                                    <div className="bg-blue-900/10 border border-blue-500/30 p-4 rounded-2xl animate-in zoom-in-95">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-blue-400 uppercase">Projeção</span>
                                            <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                                +{Math.floor((safeParse(avAmount) + 0.1) / fixedTermData.dailyVal)} DIAS
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
                                                    {formatBRDate(addDaysUTC(fixedTermData.paidUntil, Math.floor((safeParse(avAmount) + 0.1) / fixedTermData.dailyVal)))}
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
                        
                        <button onClick={() => setPaymentType('FULL')} className={`w-full p-4 rounded-2xl border transition-all flex justify-between items-center ${paymentType === 'FULL' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                            <div className="text-left"><p className="font-black uppercase text-xs flex items-center gap-2"><CheckSquare size={14}/> Quitação Total</p></div>
                        </button>

                        {paymentType === 'RENEW_AV' && (
                            <div className="animate-in slide-in-from-top-2 bg-slate-900 p-4 rounded-2xl border border-slate-800 mt-2">
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Valor a pagar</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-bold">R$</span>
                                    <input 
                                        type="text" 
                                        inputMode="decimal"
                                        value={avAmount} 
                                        onChange={e => setAvAmount(e.target.value.replace(/[^0-9.,]/g, ''))} 
                                        disabled={isProcessing} 
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-bold outline-none focus:border-blue-500 transition-colors" 
                                        placeholder="0,00" 
                                        autoFocus 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button onClick={() => { onOpenMessage(loan); }} disabled={isProcessing} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-emerald-500 transition-all"><MessageSquare/></button>
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
