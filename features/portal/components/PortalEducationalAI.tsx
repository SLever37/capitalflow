import React, { useState, useEffect } from 'react';
import { Sparkles, Lightbulb, Loader2, BookOpen, HeartPulse, RefreshCw } from 'lucide-react';
import { processNaturalLanguageCommand } from '../../../services/geminiService';
import { Loan } from '../../../types';

export const PortalEducationalAI: React.FC<{ contracts: Loan[], clientName: string }> = ({ contracts, clientName }) => {
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);

    const generateMentorAdvice = async () => {
        setLoading(true);
        try {
            const context = {
                type: 'PORTAL_CLIENT',
                clientName,
                debtCount: contracts.length,
                totalDebt: contracts.reduce((acc, c) => acc + c.totalToReceive, 0),
                isLate: contracts.some(c => c.installments.some(i => i.status === 'LATE'))
            };
            const res = await processNaturalLanguageCommand("Gere um guia rápido de saúde financeira para este cliente baseado em sua situação atual.", context);
            setAnalysis(res.analysis || res.feedback);
        } catch (e) {
            setAnalysis("Olá! Gostaria de te ajudar a organizar sua vida financeira, mas tive um probleminha técnico. Tente novamente em instantes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (contracts.length > 0) generateMentorAdvice(); }, []);

    return (
        <div className="mt-8 pt-8 border-t border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-pink-600 rounded-xl text-white shadow-lg shadow-pink-900/20">
                        <HeartPulse size={20}/>
                    </div>
                    <div>
                        <h3 className="text-white font-black uppercase text-xs tracking-tighter">Sua Jornada Financeira</h3>
                        <p className="text-[10px] text-pink-500 font-black uppercase flex items-center gap-1">
                            <Sparkles size={10}/> Mentor de Prosperidade
                        </p>
                    </div>
                </div>
                <button onClick={generateMentorAdvice} disabled={loading} className="p-2 text-slate-500 hover:text-white transition-colors">
                    {loading ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                </button>
            </div>

            <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <BookOpen size={64} className="text-white"/>
                </div>
                
                {loading && !analysis ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-pink-500" size={24}/>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Elaborando seu guia...</p>
                    </div>
                ) : (
                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-2 text-yellow-500 font-black text-[10px] uppercase tracking-widest">
                            <Lightbulb size={14}/> Insight do Dia
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                            "{analysis}"
                        </p>
                    </div>
                )}
            </div>

            <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-500/10 text-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                    Nosso objetivo é seu sucesso. Use essas dicas para construir um futuro sólido.
                </p>
            </div>
        </div>
    );
};