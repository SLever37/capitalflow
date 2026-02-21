
import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Calendar, Percent, RefreshCcw, TrendingUp, Clock, Play } from 'lucide-react';
import { Modal } from '../ui/Modal';

type CalcMode = 'MONTHLY' | 'DAILY';

export const CalculatorModal = ({ onClose }: { onClose: () => void }) => {
    const [mode, setMode] = useState<CalcMode>('MONTHLY');
    const [principal, setPrincipal] = useState('');
    const [rate, setRate] = useState('');
    const [duration, setDuration] = useState('1');
    
    // Resultados
    const [results, setResults] = useState<{
        grossProfit: number;
        totalReturn: number;
        profitPerPeriod: number;
        roi: number;
    } | null>(null);

    // Helper de parser seguro (Mesmo do PaymentManager)
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

    // Função de simulação manual e automática
    const calculate = () => {
        const p = safeParse(principal);
        const r = safeParse(rate);
        const t = safeParse(duration);

        if (p > 0 && r > 0 && t > 0) {
            let grossProfit = 0;
            let profitPerPeriod = 0;

            if (mode === 'MONTHLY') {
                // Lucro Simples: Capital * (Taxa/100) * Meses
                profitPerPeriod = p * (r / 100);
                grossProfit = profitPerPeriod * t;
            } else {
                // Diário (Baseado na taxa mensal pro-rata dia)
                // Taxa Diária = Taxa Mensal / 30
                const dailyRate = (r / 100) / 30;
                profitPerPeriod = p * dailyRate; // Lucro por dia
                grossProfit = profitPerPeriod * t; // Lucro total nos dias
            }

            const totalReturn = p + grossProfit;
            const roi = (grossProfit / p) * 100;

            setResults({
                grossProfit,
                totalReturn,
                profitPerPeriod,
                roi
            });
        }
    };

    // Cálculo automático com delay suave
    useEffect(() => {
        const timer = setTimeout(calculate, 500);
        return () => clearTimeout(timer);
    }, [principal, rate, duration, mode]);

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <Modal onClose={onClose} title="Simulador de Rentabilidade">
            <div className="space-y-6">
                
                {/* Seletor de Modalidade */}
                <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800">
                    <button 
                        onClick={() => { setMode('MONTHLY'); setDuration('1'); }} 
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${mode === 'MONTHLY' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Calendar size={14}/> Mensal
                    </button>
                    <button 
                        onClick={() => { setMode('DAILY'); setDuration('30'); }} 
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${mode === 'DAILY' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Clock size={14}/> Diário
                    </button>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-4 relative group focus-within:border-emerald-500/50 transition-all">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20"><DollarSign size={24}/></div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Capital Investido</label>
                            <input 
                                type="text" 
                                inputMode="decimal" 
                                placeholder="0,00" 
                                className="w-full bg-transparent text-white text-2xl font-black outline-none placeholder:text-slate-700" 
                                value={principal || ''} 
                                onChange={e => setPrincipal(e.target.value.replace(/[^0-9.,]/g, ''))}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3 flex-1 group focus-within:border-blue-500/50 transition-all">
                            <div className="flex-1">
                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Taxa (Mensal)</label>
                                <div className="flex items-center">
                                    <input 
                                        type="text" 
                                        inputMode="decimal" 
                                        placeholder="30" 
                                        className="w-full bg-transparent text-white text-xl font-bold outline-none placeholder:text-slate-700" 
                                        value={rate || ''} 
                                        onChange={e => setRate(e.target.value.replace(/[^0-9.,]/g, ''))}
                                    />
                                    <Percent size={14} className="text-slate-500"/>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3 flex-1 group focus-within:border-purple-500/50 transition-all">
                            <div className="flex-1">
                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{mode === 'MONTHLY' ? 'Prazo (Meses)' : 'Prazo (Dias)'}</label>
                                <input 
                                    type="text" 
                                    inputMode="decimal" 
                                    placeholder={mode === 'MONTHLY' ? "1" : "30"} 
                                    className="w-full bg-transparent text-white text-xl font-bold outline-none placeholder:text-slate-700" 
                                    value={duration || ''} 
                                    onChange={e => setDuration(e.target.value.replace(/[^0-9.,]/g, ''))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botão de Calcular Manual */}
                <button onClick={calculate} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-colors">
                    <Play size={10} className="fill-white"/> Calcular Agora
                </button>

                {/* Resultados */}
                {results ? (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        
                        {/* CARD DE LUCRO PRINCIPAL */}
                        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 p-6 rounded-[1.5rem] relative overflow-hidden shadow-2xl shadow-emerald-900/10">
                            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Lucro Líquido</div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Retorno (Juros)</span>
                                <span className="text-4xl font-black text-white tracking-tight">{formatCurrency(results.grossProfit)}</span>
                                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-300/80">
                                    <TrendingUp size={14}/>
                                    <span>ROI: +{results.roi.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* DETALHAMENTO */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Recebimento {mode === 'MONTHLY' ? 'Mensal' : 'Diário'}</p>
                                <p className="text-lg font-bold text-white mt-1">{formatCurrency(results.profitPerPeriod)}</p>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Montante Final</p>
                                <p className="text-lg font-bold text-blue-400 mt-1">{formatCurrency(results.totalReturn)}</p>
                            </div>
                        </div>

                        {/* RESUMO TEXTUAL */}
                        <div className="text-[10px] text-slate-500 text-center uppercase font-bold bg-slate-950/50 py-2 rounded-xl border border-slate-800/50">
                            {mode === 'MONTHLY' 
                                ? `Plano: ${principal} + (${results.grossProfit.toFixed(2)} juros) em ${duration} meses.`
                                : `Plano: ${principal} + (${results.grossProfit.toFixed(2)} juros) em ${duration} dias.`
                            }
                        </div>

                    </div>
                ) : (
                    <div className="py-6 text-center text-slate-700 flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-950 rounded-full flex items-center justify-center mb-2 border border-slate-900">
                            <Calculator size={24} className="opacity-30"/>
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest opacity-50">Preencha para simular</p>
                    </div>
                )}

                <button onClick={() => { setPrincipal(''); setRate(''); setDuration(mode === 'MONTHLY' ? '1' : '30'); setResults(null); }} className="w-full py-4 bg-slate-900 text-slate-500 rounded-xl text-xs font-black uppercase hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2">
                    <RefreshCcw size={14}/> Nova Simulação
                </button>
            </div>
        </Modal>
    );
};
