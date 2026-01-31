
import React, { useMemo } from 'react';
import { Wallet, CalendarX, Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { CapitalSource, LoanBillingModality } from '../../types';
import { formatMoney } from '../../utils/formatters';

interface LoanFormFinancialSectionProps {
  sources: CapitalSource[];
  formData: any;
  setFormData: any;
  isDailyModality: boolean;
  fixedDuration: string;
  setFixedDuration: (v: string) => void;
  autoDueDate: string;
  skipWeekends?: boolean;
  setSkipWeekends?: (v: boolean) => void;
}

export const LoanFormFinancialSection: React.FC<LoanFormFinancialSectionProps> = ({
  sources, formData, setFormData, isDailyModality, fixedDuration, setFixedDuration, autoDueDate, skipWeekends, setSkipWeekends
}) => {
  
  const selectedSource = sources.find(s => s.id === formData.sourceId);
  const isCardSource = selectedSource?.type === 'CARD';

  // Cálculo de Custo em tempo real
  const fundingCostDisplay = useMemo(() => {
      const principal = parseFloat(formData.principal) || 0;
      const totalPayable = parseFloat(formData.fundingTotalPayable) || 0;
      if (totalPayable > principal) {
          return {
              cost: totalPayable - principal,
              isValid: true
          };
      }
      return { cost: 0, isValid: totalPayable === 0 }; // 0 é válido se não preenchido, mas se preenchido deve ser > principal
  }, [formData.principal, formData.fundingTotalPayable]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-500 flex items-center gap-2"><Wallet className="w-4 h-4" /> Condições</h3>
      <div className="space-y-4">
        
        {/* Seletor de Modalidade */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button type="button" onClick={() => setFormData({...formData, billingCycle: 'MONTHLY'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.billingCycle === 'MONTHLY' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Mensal</button>
            <button type="button" onClick={() => setFormData({...formData, billingCycle: 'DAILY_FREE'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isDailyModality ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Diário</button>
        </div>

        {isDailyModality && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                    <label className="text-[9px] text-purple-400 font-black uppercase ml-2">Tipo de Diária</label>
                    <select 
                        value={formData.billingCycle} 
                        onChange={(e) => setFormData({...formData, billingCycle: e.target.value as LoanBillingModality})} 
                        className="w-full bg-slate-900 border border-purple-500/30 rounded-2xl px-4 py-3 text-white text-xs outline-none focus:border-purple-500"
                    >
                        <option value="DAILY_FREE">Diária Livre (Somente Juros)</option>
                        <option value="DAILY_FIXED_TERM">Prazo Fixo (Parcela Fixa)</option>
                    </select>
                </div>

                {/* Input de Prazo (Aparece apenas para DAILY_FIXED_TERM) */}
                {formData.billingCycle === 'DAILY_FIXED_TERM' && (
                    <div className="space-y-1 animate-in fade-in">
                        <label className="text-[9px] text-slate-500 font-black uppercase ml-2 flex items-center gap-1"><Clock size={10}/> Prazo Total (Dias)</label>
                        <input 
                            type="number" 
                            min="1"
                            value={fixedDuration} 
                            onChange={(e) => setFixedDuration(e.target.value)} 
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold text-sm"
                            placeholder="Ex: 30"
                        />
                    </div>
                )}

                {/* Switch de Dias Úteis */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between group hover:border-purple-500/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${skipWeekends ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            <CalendarX size={18}/>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white">Pular Fins de Semana</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">Apenas Dias Úteis</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => setSkipWeekends?.(!skipWeekends)}
                        className={`w-12 h-6 rounded-full transition-all relative ${skipWeekends ? 'bg-purple-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${skipWeekends ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>
            </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] text-slate-500 font-black uppercase ml-2">Principal</label>
            <input required type="number" step="0.01" value={formData.principal} onChange={e => setFormData({...formData,principal: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-slate-500 font-black uppercase ml-2">{formData.billingCycle === 'MONTHLY' ? 'Juros (%) Mensal' : 'Taxa (%) Mensal'}</label>
            <input required type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2">Data Empréstimo</label>
              <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm" />
          </div>
          <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2">{formData.billingCycle === 'DAILY_FREE' ? 'Pago Até:' : 'Vencimento (1º)'}</label>
              <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-emerald-500 font-bold text-sm flex items-center justify-center">
                  {formData.billingCycle === 'DAILY' || formData.billingCycle === 'DAILY_FIXED_TERM' ? 'Sequencial' : `${autoDueDate}`}
              </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-black uppercase ml-2">Multa (%)</label>
                <input type="number" step="0.1" value={formData.finePercent} onChange={e => setFormData({...formData, finePercent: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm" />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-black uppercase ml-2">Mora Diária (%)</label>
                <input type="number" step="0.1" value={formData.dailyInterestPercent} onChange={e => setFormData({...formData, dailyInterestPercent: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm" />
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-[9px] text-slate-500 font-black uppercase ml-2">Fonte de Capital</label>
            <select value={formData.sourceId} onChange={e => setFormData({...formData, sourceId: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none">
              {sources.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type === 'CARD' ? 'Crédito' : `R$ ${s.balance.toLocaleString()}`})</option>)}
            </select>
        </div>

        {/* --- CUSTO DE CAPTAÇÃO (CARTÃO) --- */}
        {isCardSource && (
            <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-2xl space-y-4 animate-in slide-in-from-right">
                <div className="flex items-center gap-2 text-rose-400 mb-2">
                    <CreditCard size={16}/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Custo de Captação (Cartão)</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] text-rose-300/70 font-black uppercase ml-2">Total a Pagar na Fatura</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            placeholder="Ex: 1200.00"
                            value={formData.fundingTotalPayable || ''} 
                            onChange={e => setFormData({...formData, fundingTotalPayable: e.target.value})} 
                            className="w-full bg-slate-900 border border-rose-500/30 rounded-2xl px-5 py-4 text-white font-bold focus:border-rose-500 outline-none" 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] text-rose-300/70 font-black uppercase ml-2">Custo Calculado</label>
                        <div className="w-full bg-slate-950/50 border border-rose-500/10 rounded-2xl px-5 py-4 text-rose-400 font-bold flex items-center justify-between">
                            <span>R$ {formatMoney(fundingCostDisplay.cost)}</span>
                            {fundingCostDisplay.cost > 0 && <span className="text-[8px] bg-rose-500/20 px-1.5 py-0.5 rounded uppercase">Custo</span>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] text-rose-300/70 font-black uppercase ml-2">Operadora / Maquininha</label>
                        <input 
                            type="text" 
                            placeholder="Ex: InfinitePay"
                            value={formData.fundingProvider || ''} 
                            onChange={e => setFormData({...formData, fundingProvider: e.target.value})} 
                            className="w-full bg-slate-900 border border-rose-500/30 rounded-2xl px-5 py-4 text-white text-sm outline-none" 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] text-rose-300/70 font-black uppercase ml-2">Taxa (%)</label>
                        <input 
                            type="number" 
                            step="0.01"
                            placeholder="Ex: 12.5"
                            value={formData.fundingFeePercent || ''} 
                            onChange={e => setFormData({...formData, fundingFeePercent: e.target.value})} 
                            className="w-full bg-slate-900 border border-rose-500/30 rounded-2xl px-5 py-4 text-white text-sm outline-none" 
                        />
                    </div>
                </div>

                {formData.fundingTotalPayable && parseFloat(formData.fundingTotalPayable) < parseFloat(formData.principal) && (
                    <div className="flex items-start gap-2 bg-rose-500/10 p-3 rounded-xl">
                        <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5"/>
                        <p className="text-[10px] text-rose-300 leading-tight">
                            <b>Erro:</b> O total a pagar na fatura não pode ser menor que o valor entregue ao cliente (Principal).
                        </p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
