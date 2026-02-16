import React, { useState, useEffect } from 'react';
import { BrainCircuit, Loader2, Sparkles, TrendingUp, Users } from 'lucide-react';
import { processNaturalLanguageCommand } from '../../../services/geminiService';

export const TeamAIInsight: React.FC<{ members: any[], teamName?: string }> = ({ members, teamName }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [insight, setInsight] = useState<any>(null);

    const runAnalysis = async () => {
        if (members.length === 0) return;
        setIsAnalyzing(true);
        try {
            const context = {
                type: 'TEAM_PAGE',
                teamName: teamName || 'Equipe Principal',
                memberCount: members.length,
                members: members.map(m => ({
                    name: m.full_name,
                    role: m.role,
                    logins: m.linked_profile?.access_count || 0,
                    status: m.invite_status
                }))
            };
            const res = await processNaturalLanguageCommand("Analise o engajamento e a estrutura desta equipe.", context);
            setInsight(res);
        } catch (e) {
            setInsight({ feedback: "Erro ao analisar equipe." });
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => { runAnalysis(); }, [members.length]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/5 blur-[50px] rounded-full pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl">
                    <BrainCircuit size={20}/>
                </div>
                <div>
                    <h3 className="text-white font-black uppercase text-xs tracking-tighter">Visão do Gestor IA</h3>
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Sparkles size={10}/> Team Performance
                    </p>
                </div>
            </div>

            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                {isAnalyzing ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="animate-spin text-blue-500" size={20}/>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Avaliando Operadores...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                            {insight?.analysis || insight?.feedback || "Selecione uma equipe para começar a análise estratégica de performance."}
                        </p>
                        
                        {insight?.suggestions && (
                            <div className="pt-4 border-t border-slate-800">
                                <p className="text-[10px] font-black text-blue-500 uppercase mb-2">Recomendações:</p>
                                <ul className="space-y-2">
                                    {insight.suggestions.map((s: string, i: number) => (
                                        <li key={i} className="text-[10px] text-slate-400 flex items-start gap-2">
                                            <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5"></div>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-center justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest">
                <span>Relatório Gerencial</span>
                <span>v3.0 Strategic</span>
            </div>
        </div>
    );
};
