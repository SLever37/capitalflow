
import React, { useState, useEffect } from 'react';
import { BrainCircuit, Sparkles, RefreshCw, Lightbulb } from 'lucide-react';
import { processNaturalLanguageCommand } from '../../../services/geminiService';
import { PFTransaction, PFAccount, PFCard } from '../types';

interface Props {
    transactions: PFTransaction[];
    accounts: PFAccount[];
    cards: PFCard[];
    profileId: string;
    onRefresh: () => void;
}

export const PersonalFinanceAI: React.FC<Props> = ({ transactions, accounts, cards }) => {
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-executa a análise quando os dados mudam ou na montagem
    useEffect(() => {
        if (transactions.length > 0 || accounts.length > 0) {
            generateInsight();
        }
    }, [transactions.length, accounts.length]);

    const generateInsight = async () => {
        setLoading(true);
        try {
            // Contexto rico para a IA
            const context = {
                type: 'PERSONAL_FINANCE',
                balance: accounts.reduce((acc, a) => acc + a.saldo, 0),
                totalExpensesMonth: transactions.filter(t => t.tipo === 'DESPESA').reduce((acc, t) => acc + t.valor, 0),
                accounts: accounts.map(a => ({ name: a.nome, id: a.id, balance: a.saldo })),
                cards: cards.map(c => ({ name: c.nome, id: c.id, limit: c.limite })),
                topCategories: transactions.filter(t => t.tipo === 'DESPESA').map(t => t.category_name || 'Outros')
            };

            // Prompt fixo de consultoria
            const prompt = "Aja como um Consultor Financeiro Pessoal Sênior. Analise meus dados atuais (saldo, gastos do mês, estrutura de contas). Identifique padrões, sugira otimizações e me dê um resumo executivo da minha saúde financeira. Seja direto, motivador e estratégico. Não use saudações genéricas.";
            
            const res = await processNaturalLanguageCommand(prompt, context);
            
            // Prioriza a análise ou o feedback
            setAnalysis(res.analysis || res.feedback || "Análise concluída.");

        } catch (e: any) {
            setAnalysis("Não foi possível gerar o insight no momento.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-gradient-to-r from-slate-900 to-slate-900 border border-pink-500/30 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl mt-8">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-600/10 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-pink-600 rounded-2xl text-white shadow-lg shadow-pink-600/20 animate-pulse">
                        <BrainCircuit size={28}/>
                    </div>
                    <div>
                        <h3 className="text-white font-black uppercase text-lg tracking-tight">Consultor Financeiro AI</h3>
                        <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Sparkles size={12}/> Análise Automática de Patrimônio
                        </p>
                    </div>
                </div>

                <button 
                    onClick={generateInsight}
                    disabled={loading}
                    className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all disabled:opacity-50"
                    title="Atualizar Análise"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 relative z-10">
                {loading ? (
                    <div className="flex items-center gap-3 text-slate-500 py-4">
                        <Sparkles size={18} className="animate-pulse text-pink-500"/>
                        <span className="text-xs font-bold uppercase tracking-widest">Processando dados financeiros...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Lightbulb size={20} className="text-yellow-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                                {analysis || "Aguardando dados para análise..."}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="mt-4 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-600 relative z-10">
                <span>Powered by Gemini 1.5 Pro</span>
                <span>Visão Estratégica</span>
            </div>
        </div>
    );
};
