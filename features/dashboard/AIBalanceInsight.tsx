import React, { useState, useEffect } from 'react';
import { BrainCircuit, Loader2, ShieldAlert, Sparkles, RefreshCw, BarChart3, TrendingDown, Target } from 'lucide-react';
import { Loan, CapitalSource, UserProfile } from '../../types';
import { processNaturalLanguageCommand } from '../../services/geminiService';

export const AIBalanceInsight: React.FC<{ loans: Loan[], sources: CapitalSource[], activeUser: UserProfile | null }> = ({ loans, sources, activeUser }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<string>('');

    const runAudit = async () => {
        setIsAnalyzing(true);
        try {
            const context = {
                type: 'DASHBOARD_AUDIT',
                totalLent: loans.reduce((acc, l) => acc + (l.isArchived ? 0 : l.principal), 0),
                interestBalance: activeUser?.interestBalance || 0,
                lateCount: loans.filter(l => !l.isArchived && l.installments.some(i => i.status === 'LATE')).length,
                sourceLiquidity: sources.reduce((acc, s) => acc + s.balance, 0)
            };
            const res = await processNaturalLanguageCommand("Gere um Veredito de Auditoria Técnica sobre a saúde desta carteira.", context);
            setAnalysis(res.analysis || res.feedback);
        } catch (e) {
            setAnalysis("Erro na análise técnica.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => { if (loans.length > 0) runAudit(); }, []);

    return (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl mt-8">
            <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg"><BrainCircuit size={20}/></div>
                    <div>
                        <h3 className="text-xs font-black text-white uppercase">Veredito do Auditor IA</h3>
                        <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1"><Sparkles size={10}/> Chief Risk Officer</p>
                    </div>
                </div>
                <button onClick={runAudit} disabled={isAnalyzing} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all">
                    {isAnalyzing ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                </button>
            </div>

            <div className="p-6 bg-slate-950/30">
                {isAnalyzing && !analysis ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-blue-500" size={32}/>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Processando Variáveis Macro...</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-1000">
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Índice de Risco</p>
                                <div className="flex items-center gap-2">
                                    <ShieldAlert size={14} className="text-rose-500"/>
                                    <span className="text-xs font-bold text-white">Calculando...</span>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Target de Recuperação</p>
                                <div className="flex items-center gap-2">
                                    <Target size={14} className="text-emerald-500"/>
                                    <span className="text-xs font-bold text-white">Otimizado</span>
                                </div>
                            </div>
                        </div>
                        <div className="prose prose-invert max-w-none">
                            <p className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                                {analysis}
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex justify-center">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Análise de Integridade Estrita • v4.0</p>
            </div>
        </div>
    );
};