
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
  const [gracePeriod, setGracePeriod] = useState(0);
  const [installments, setInstallments] = useState(1);
  const [isInstallmentMode, setIsInstallmentMode] = useState(false);
  const [isAgreementMode, setIsAgreementMode] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<'PARTIAL' | 'FULL' | 'RENEWAL'>('PARTIAL');
  
  // Novo estado para modalidade de cálculo (Preparação Tarefa 6)
  const [calculationMode, setCalculationMode] = useState<'NORMAL' | 'REVERSE'>('NORMAL');
  const [targetInstallment, setTargetInstallment] = useState(0);

  // Estado de Controle (Simular)
  const [hasSimulated, setHasSimulated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const today = new Date();
  
  // Cálculo Base
  const calculation = useMemo(() => {
    if (isAgreementMode) {
      const netDebt = principal - discount - downPayment;
      const installmentValue = installments > 0 ? netDebt / installments : netDebt;
      
      const installmentList = Array.from({ length: installments }).map((_, i) => {
        const dueDate = new Date(today.getTime() + (daysToMaturity / installments) * (i + 1) * 24 * 60 * 60 * 1000);
        return {
          number: i + 1,
          value: installmentValue,
          dueDate
        };
      });

      return {
        interest: 0,
        total: netDebt,
        principal: netDebt,
        installmentValue,
        daysToMaturity,
        gracePeriod: 0,
        dueDate: new Date(today.getTime() + daysToMaturity * 24 * 60 * 60 * 1000),
        installmentList,
        cet: 0
      };
    }

    // Usar a função utilitária para garantir consistência
    const loanResult = calculateLoan({
      principal: calculationMode === 'NORMAL' ? principal : 0,
      dailyRate: dailyRate / 100,
      startDate: today,
      dueDate: new Date(today.getTime() + (daysToMaturity + gracePeriod) * 24 * 60 * 60 * 1000),
      calculationMode,
      targetInstallmentValue: targetInstallment
    });

    const safeInstallments = Math.max(1, installments);
    const installmentValue = isInstallmentMode ? loanResult.total / safeInstallments : loanResult.total;

    // Gerar lista de parcelas para visualização
    const installmentList = Array.from({ length: safeInstallments }).map((_, i) => {
      const dueDate = new Date(today.getTime() + (gracePeriod + (daysToMaturity / safeInstallments) * (i + 1)) * 24 * 60 * 60 * 1000);
      return {
        number: i + 1,
        value: installmentValue,
        dueDate
      };
    });

    return {
      interest: loanResult.interest,
      total: loanResult.total,
      principal: loanResult.principal,
      installmentValue,
      daysToMaturity,
      gracePeriod,
      dueDate: loanResult.nextDueDate || new Date(today.getTime() + (daysToMaturity + gracePeriod) * 24 * 60 * 60 * 1000),
      installmentList,
      cet: (loanResult.interest / loanResult.principal) * 100
    };
  }, [principal, dailyRate, daysToMaturity, gracePeriod, installments, isInstallmentMode, isAgreementMode, discount, downPayment, calculationMode, targetInstallment]);

  // Simulação de Pagamento
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const handleSimulate = () => {
    setIsCalculating(true);
    setHasSimulated(false);
    
    setTimeout(() => {
      const result = simulatePayment({
        principal: calculation.principal,
        dailyRate: dailyRate / 100,
        startDate: today,
        dueDate: calculation.dueDate,
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
    <div className="space-y-6 animate-in fade-in duration-300 font-sans pb-24">
      {/* Header - Minimalista e Padronizado */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-900/20">
              <Calculator size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white uppercase tracking-wider leading-none">
                Simulador <span className="text-blue-500">Financeiro</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium uppercase mt-1 tracking-widest">Cálculos e Projeções</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6">
        
        {/* 1. Parâmetros de Entrada */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <DollarSign size={14} className="text-blue-500" /> Parâmetros do Empréstimo
            </h3>
            <div className="flex flex-wrap gap-2">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button 
                  onClick={() => { setCalculationMode('NORMAL'); resetSimulation(); }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    calculationMode === 'NORMAL'
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Normal
                </button>
                <button 
                  onClick={() => { setCalculationMode('REVERSE'); resetSimulation(); }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    calculationMode === 'REVERSE'
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Reverso
                </button>
              </div>

              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button 
                  onClick={() => { setIsInstallmentMode(false); setIsAgreementMode(false); resetSimulation(); }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    !isInstallmentMode && !isAgreementMode
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  À Vista
                </button>
                <button 
                  onClick={() => { setIsInstallmentMode(true); setIsAgreementMode(false); resetSimulation(); }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    isInstallmentMode && !isAgreementMode
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Parcelado
                </button>
                <button 
                  onClick={() => { setIsAgreementMode(true); setIsInstallmentMode(false); resetSimulation(); }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    isAgreementMode
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Acordo
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest block ml-1">
                  {calculationMode === 'REVERSE' ? 'Valor da Parcela Desejada (R$)' : (isAgreementMode ? 'Dívida Total (R$)' : 'Valor do Capital (R$)')}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">R$</span>
                  <input
                    type="number"
                    value={calculationMode === 'REVERSE' ? targetInstallment : principal}
                    onChange={(e) => { 
                      let raw = e.target.value;
                      if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
                        raw = raw.replace(/^0+/, '');
                        e.target.value = raw;
                      }
                      const val = raw === '' ? 0 : Number(raw);
                      if (calculationMode === 'REVERSE') setTargetInstallment(val);
                      else setPrincipal(val); 
                      resetSimulation(); 
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              {calculationMode === 'REVERSE' && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest block ml-1">
                    Capital Calculado (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">R$</span>
                    <input
                      type="text"
                      readOnly
                      value={formatMoney(calculation.principal).replace('R$', '').trim()}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-base font-black text-blue-400 outline-none cursor-default"
                    />
                  </div>
                </div>
              )}

              {!isAgreementMode ? (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest block ml-1">
                    Taxa Diária (%)
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">%</span>
                    <input
                      type="number"
                      step="0.01"
                      value={dailyRate}
                      onChange={(e) => { 
                        let raw = e.target.value;
                        if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
                          raw = raw.replace(/^0+/, '');
                          e.target.value = raw;
                        }
                        setDailyRate(raw === '' ? 0 : Number(raw)); 
                        resetSimulation(); 
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest block ml-1">
                    Desconto (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">R$</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => { 
                        let raw = e.target.value;
                        if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
                          raw = raw.replace(/^0+/, '');
                          e.target.value = raw;
                        }
                        setDiscount(raw === '' ? 0 : Number(raw)); 
                        resetSimulation(); 
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest block ml-1">
                  {isAgreementMode ? 'Valor de Entrada (R$)' : 'Prazo Total (Dias)'}
                </label>
                <div className="relative">
                  {isAgreementMode && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">R$</span>}
                  <input
                    type="number"
                    value={isAgreementMode ? downPayment : daysToMaturity}
                    onChange={(e) => { 
                      let raw = e.target.value;
                      if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
                        raw = raw.replace(/^0+/, '');
                        e.target.value = raw;
                      }
                      const val = raw === '' ? 0 : Number(raw);
                      if (isAgreementMode) setDownPayment(val);
                      else setDaysToMaturity(val);
                      resetSimulation(); 
                    }}
                    className={`w-full bg-slate-950 border border-slate-800 rounded-xl py-3 ${isAgreementMode ? 'pl-10' : 'px-4'} pr-4 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner`}
                  />
                </div>
              </div>

              {!isAgreementMode ? (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest block ml-1">
                    Carência (Dias)
                  </label>
                  <input
                    type="number"
                    value={gracePeriod}
                    onChange={(e) => { 
                      let raw = e.target.value;
                      if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
                        raw = raw.replace(/^0+/, '');
                        e.target.value = raw;
                      }
                      setGracePeriod(raw === '' ? 0 : Number(raw)); 
                      resetSimulation(); 
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest block ml-1">
                    Prazo do Acordo (Dias)
                  </label>
                  <input
                    type="number"
                    value={daysToMaturity}
                    onChange={(e) => { 
                      let raw = e.target.value;
                      if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
                        raw = raw.replace(/^0+/, '');
                        e.target.value = raw;
                      }
                      setDaysToMaturity(raw === '' ? 0 : Number(raw)); 
                      resetSimulation(); 
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
              )}

              {(isInstallmentMode || isAgreementMode) && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest block ml-1">
                    Número de Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={installments}
                    onChange={(e) => { 
                      let raw = e.target.value;
                      if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
                        raw = raw.replace(/^0+/, '');
                        e.target.value = raw;
                      }
                      setInstallments(raw === '' ? 0 : Number(raw)); 
                      resetSimulation(); 
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Resultado Detalhado */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-600/5 blur-3xl rounded-full -ml-20 -mb-20"></div>
          
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 relative z-10">
            <TrendingUp size={14} className="text-emerald-500" /> Resumo do Cálculo
          </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800/50">
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest mb-1">Juros Totais</p>
              <p className="text-xl font-black text-white">{formatMoney(calculation.interest)}</p>
            </div>
            <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800/50">
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest mb-1">Custo Efetivo (CET)</p>
              <p className="text-xl font-black text-emerald-500">+{calculation.cet.toFixed(1)}%</p>
            </div>
            <div className="bg-blue-600/10 rounded-2xl p-5 border border-blue-500/20">
              <p className="text-sm text-blue-400 font-semibold uppercase tracking-widest mb-1">Valor Final Total</p>
              <p className="text-xl font-black text-white">{formatMoney(calculation.total)}</p>
            </div>
          </div>

          {(isInstallmentMode || isAgreementMode) && (
            <div className="space-y-4 relative z-10">
              <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest">Valor de cada Parcela</p>
                  <p className="text-2xl font-black text-white">{formatMoney(calculation.installmentValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest">Frequência</p>
                  <p className="text-sm font-black text-white uppercase">A cada {(daysToMaturity / installments).toFixed(0)} dias</p>
                </div>
              </div>

              {/* Lista de Parcelas */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest ml-1">Cronograma de Pagamentos</p>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {calculation.installmentList.map((inst) => (
                    <div key={inst.number} className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800/50 hover:bg-slate-950 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-black text-slate-400">
                          {inst.number}
                        </span>
                        <span className="text-sm font-bold text-slate-300">{formatDate(inst.dueDate)}</span>
                      </div>
                      <span className="text-sm font-black text-white">{formatMoney(inst.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isInstallmentMode && !isAgreementMode && (
            <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <CalIcon size={20} className="text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest">Vencimento Único</p>
                  <p className="text-sm font-black text-white">{formatDate(calculation.dueDate)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest">Prazo</p>
                <p className="text-sm font-black text-white">{daysToMaturity} dias</p>
              </div>
            </div>
          )}
        </div>

        {/* 3. Simulação de Amortização */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-amber-600/5 blur-3xl rounded-full -ml-16 -mt-16"></div>
          
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 relative z-10">
            <Info size={14} className="text-amber-500" /> Projeção de Pagamento
          </h3>

          <div className="space-y-5 relative z-10">
            <div className="flex flex-wrap sm:flex-nowrap bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['PARTIAL', 'FULL', 'RENEWAL'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setPaymentType(type); resetSimulation(); }}
                  className={`flex-1 min-w-[80px] py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold uppercase tracking-widest transition-all whitespace-nowrap ${
                    paymentType === type
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {type === 'PARTIAL' ? 'Parcial' : type === 'FULL' ? 'Quitação' : 'Renovação'}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest block ml-1">
                Valor do Pagamento (R$)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">R$</span>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => { 
                    let raw = e.target.value;
                    if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
                      raw = raw.replace(/^0+/, '');
                      e.target.value = raw;
                    }
                    setPaymentAmount(raw === '' ? 0 : Number(raw)); 
                    resetSimulation(); 
                  }}
                  placeholder="0,00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-base font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                />
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={isCalculating || paymentAmount <= 0}
              className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-slate-200 transition-all disabled:opacity-50 shadow-xl active:scale-95"
            >
              {isCalculating ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <><Play size={20} fill="currentColor" /> Simular Projeção</>
              )}
            </button>
          </div>

          {/* Resultado da Simulação */}
          {hasSimulated && simulationResult && (
            <div className="bg-slate-950 rounded-3xl p-6 border border-blue-500/30 space-y-5 animate-in zoom-in-95 duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <CheckCircle2 size={24} className="text-blue-500/20" />
              </div>
              
              <div className="flex items-center gap-2 text-blue-400">
                <CheckCircle2 size={16} />
                <span className="text-sm font-semibold uppercase tracking-widest">Resultado Projetado</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest">Saldo Devedor Remanescente</p>
                  <p className="text-2xl font-black text-white">
                    {formatMoney(simulationResult.remainingAfterPayment || 0)}
                  </p>
                </div>
                {simulationResult.nextInstallmentDate && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest">Próximo Vencimento</p>
                    <p className="text-2xl font-black text-white">
                      {formatDate(simulationResult.nextInstallmentDate)}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/50">
                <p className="text-sm text-slate-500 font-medium leading-relaxed italic">
                  * Esta é uma simulação baseada nos parâmetros informados. Valores reais podem variar conforme taxas de mercado e condições contratuais.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
