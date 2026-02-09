
import React, { useState } from 'react';
import { BrainCircuit, Send, Loader2, Sparkles } from 'lucide-react';
import { processNaturalLanguageCommand } from '../../../services/geminiService';
import { personalFinanceService } from '../services/personalFinanceService';
import { PFTransaction, PFAccount, PFCard } from '../types';

interface Props {
    transactions: PFTransaction[];
    accounts: PFAccount[];
    cards: PFCard[];
    profileId: string;
    onRefresh: () => void;
}

export const PersonalFinanceAI: React.FC<Props> = ({ transactions, accounts, cards, profileId, onRefresh }) => {
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);
    const [question, setQuestion] = useState('');

    const handleAsk = async () => {
        if (!question.trim()) return;
        setLoading(true);
        setAnalysis("Processando...");
        
        try {
            // Contexto rico para a IA saber o que existe
            const context = {
                type: 'PERSONAL_FINANCE',
                balance: accounts.reduce((acc, a) => acc + a.saldo, 0),
                totalExpensesMonth: transactions.filter(t => t.tipo === 'DESPESA').reduce((acc, t) => acc + t.valor, 0),
                accounts: accounts.map(a => ({ name: a.nome, id: a.id, balance: a.saldo })),
                cards: cards.map(c => ({ name: c.nome, id: c.id, limit: c.limite })),
                topCategories: transactions.filter(t => t.tipo === 'DESPESA').map(t => t.category_name || 'Outros')
            };

            const prompt = question;
            const res = await processNaturalLanguageCommand(prompt, context);
            
            // --- EXECUÇÃO DE COMANDOS ---
            if (res.intent === 'PF_ADD_ASSET') {
                const { name, type, balance, limit } = res.data;
                if (type === 'CARD' || (name && name.toLowerCase().includes('cartão'))) {
                    await personalFinanceService.addCard({ nome: name, limite: limit || 1000, dia_fechamento: 1, dia_vencimento: 10 }, profileId);
                    setAnalysis(`✅ Cartão "${name}" criado com sucesso!`);
                } else {
                    await personalFinanceService.addAccount({ nome: name, tipo: 'CORRENTE', saldo: balance || 0 }, profileId);
                    setAnalysis(`✅ Conta/Carteira "${name}" criada com sucesso!`);
                }
                onRefresh();
            } 
            else if (res.intent === 'PF_REMOVE_ASSET') {
                const targetName = res.data.name?.toLowerCase();
                const acc = accounts.find(a => a.nome.toLowerCase().includes(targetName));
                const card = cards.find(c => c.nome.toLowerCase().includes(targetName));
                
                if (acc) {
                    await personalFinanceService.deleteAccount(acc.id);
                    setAnalysis(`🗑️ Conta "${acc.nome}" removida.`);
                } else if (card) {
                    await personalFinanceService.deleteCard(card.id);
                    setAnalysis(`🗑️ Cartão "${card.nome}" removido.`);
                } else {
                    setAnalysis(`⚠️ Não encontrei nenhuma conta ou cartão com o nome "${res.data.name}".`);
                }
                onRefresh();
            }
            else if (res.intent === 'PF_ADD_TRANSACTION') {
                // Implementação futura ou básica
                setAnalysis("📝 Funcionalidade de adicionar transação via chat em breve. Use o botão (+).");
            }
            else {
                // Apenas análise/conselho
                setAnalysis(res.analysis || res.feedback || "Entendido.");
            }

            setQuestion(''); // Limpa input se deu certo
        } catch (e: any) {
            setAnalysis("Erro ao processar comando: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-pink-500/30 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/10 blur-[50px] rounded-full"></div>
            
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-pink-600 rounded-xl text-white shadow-lg shadow-pink-600/20">
                    <BrainCircuit size={20}/>
                </div>
                <h3 className="text-white font-black uppercase text-sm">Finanças IA</h3>
            </div>

            <div className="space-y-3">
                {analysis && (
                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap animate-in fade-in">
                        {analysis}
                    </div>
                )}
                
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder="Ex: Cadastrar cartão Nubank com limite de 5000"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-pink-500 transition-colors placeholder:text-slate-600"
                        onKeyDown={e => e.key === 'Enter' && handleAsk()}
                    />
                    <button 
                        onClick={handleAsk}
                        disabled={loading}
                        className="p-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl transition-all shadow-lg disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                    </button>
                </div>
                <p className="text-[9px] text-slate-500 ml-1">Tente: "Adicionar carteira Cofre com 200 reais" ou "Remover cartão X"</p>
            </div>
        </div>
    );
};
