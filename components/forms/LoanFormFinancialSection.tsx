
import React from 'react';
import { Wallet, CalendarX, Clock } from 'lucide-react';
import { CapitalSource, LoanBillingModality } from '../../types';

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
              {sources.map(s => <option key={s.id} value={s.id}>{s.name} (R$ {s.balance.toLocaleString()})</option>)}
            </select>
        </div>
      </div>
    </div>
  );
};
