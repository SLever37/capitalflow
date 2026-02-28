
import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Calendar as CalIcon, Info, ChevronLeft, Play, RefreshCw, CheckCircle2 } from 'lucide-react';
import { calculateLoan, simulatePayment, formatCurrency, formatDate } from '../../utils/loanCalculator';
import { formatMoney } from '../../utils/formatters';

interface SimulatorPanelProps {
  onClose: () => void;
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({ onClose }) => {
  // Estados de Entrada
  const [principal, setPrincipal] = useState(1000);
  const [dailyRate, setDailyRate] = useState(0.05);
  const [daysToMaturity, setDaysToMaturity] = useState(30);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<'PARTIAL' | 'FULL' | 'RENEWAL'>('PARTIAL');
  
  // Estado de Controle (Simular)
  const [hasSimulated, setHasSimulated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const today = new Date();
  const dueDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysToMaturity);
    return d;
  }, [daysToMaturity]);

  // Cálculo Base (Sempre atualizado para visualização rápida)
  const calculation = useMemo(() => {
    return calculateLoan({
      principal,
      dailyRate: dailyRate / 100,
      startDate: today,
      dueDate,
      lateFeeFixed: 50,
      lateFeeDaily: 0.02,
      currentDate: today,
    });
  }, [principal, dailyRate, daysToMaturity]);

  // Simulação de Pagamento (Só processa ao clicar em Simular)
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const handleSimulate = () => {
    setIsCalculating(true);
    setHasSimulated(false);
    
    // Simula um pequeno delay para feedback visual (padrão do sistema)
    setTimeout(() => {
      const result = simulatePayment({
        principal,
        dailyRate: dailyRate / 100,
        startDate: today,
        dueDate,
        lateFeeFixed: 50,
        lateFeeDaily: 0.02,
        currentDate: today,
        paymentAmount,
        paymentType,
      });
      
      setSimulationResult(result);
      setHasSimulated(true);
      setIsCalculating(false);
    }, 600);
  };

  const resetSimulation = () => {
    setHasSimulated(false);
    setSimulationResult(null);
    setPaymentAmount(0);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-300 font-sans h-[100dvh]">
      {/* Header - Padrão Hub Central */}
      <div className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-900/20">
            <Calculator size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider leading-none">
              Simulador <span className="text-blue-500">Pro</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
              Cálculo Real de Empréstimo
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4 space-y-6 pb-24">
        
        {/* 1. Parâmetros de Entrada */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 space-y-6 shadow-xl">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <DollarSign size={14} className="text-blue-500" /> Configuração do Contrato
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                Valor Principal (R$)
              </label>
              <input
                type="number"
                value={principal}
                onChange={(e) => { setPrincipal(Number(e.target.value)); resetSimulation(); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-5 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                  Taxa Diária (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={dailyRate}
                  onChange={(e) => { setDailyRate(Number(e.target.value)); resetSimulation(); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-5 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                  Prazo (Dias)
                </label>
                <input
                  type="number"
                  value={daysToMaturity}
                  onChange={(e) => { setDaysToMaturity(Number(e.target.value)); resetSimulation(); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-5 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Resumo do Contrato */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2rem] p-6 space-y-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <TrendingUp size={80} />
          </div>
          
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-500" /> Projeção de Vencimento
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Juros Acumulados</p>
              <p className="text-xl font-black text-white">{formatMoney(calculation.interest)}</p>
            </div>
            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Bruto</p>
              <p className="text-xl font-black text-blue-400">{formatMoney(calculation.total)}</p>
            </div>
          </div>

          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalIcon size={18} className="text-slate-500" />
              <div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Data de Vencimento</p>
                <p className="text-xs font-black text-white">{formatDate(dueDate)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Rentabilidade</p>
              <p className="text-xs font-black text-emerald-500">+{((calculation.interest / principal) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* 3. Simulação de Pagamento */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 space-y-6 shadow-xl">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Info size={14} className="text-amber-500" /> Simular Amortização
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(['PARTIAL', 'FULL', 'RENEWAL'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setPaymentType(type); resetSimulation(); }}
                  className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                    paymentType === type
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  {type === 'PARTIAL' ? 'Parcial' : type === 'FULL' ? 'Quitação' : 'Renovação'}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                Valor do Pagamento (R$)
              </label>
              <input
                type="number"
                value={paymentAmount || ''}
                onChange={(e) => { setPaymentAmount(Number(e.target.value)); resetSimulation(); }}
                placeholder="0,00"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-5 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
              />
            </div>

            {/* Botão Simular - FUNCIONAL */}
            <button
              onClick={handleSimulate}
              disabled={isCalculating || paymentAmount <= 0}
              className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-50 shadow-xl active:scale-95"
            >
              {isCalculating ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <><Play size={18} fill="currentColor" /> Simular Agora</>
              )}
            </button>
          </div>

          {/* Resultado da Simulação */}
          {hasSimulated && simulationResult && (
            <div className="bg-slate-950 rounded-2xl p-5 border border-blue-500/30 space-y-4 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 text-blue-400">
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Resultado da Projeção</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Saldo Devedor</p>
                  <p className="text-lg font-black text-white">
                    {formatMoney(simulationResult.remainingAfterPayment || 0)}
                  </p>
                </div>
                {simulationResult.nextInstallmentDate && (
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Novo Vencimento</p>
                    <p className="text-lg font-black text-white">
                      {formatDate(simulationResult.nextInstallmentDate)}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <p className="text-[9px] text-slate-500 font-bold leading-relaxed italic">
                  * Esta é uma simulação baseada nas taxas atuais. Valores reais podem variar conforme a data efetiva do pagamento.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
