
import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Send, Loader2, ShieldAlert, Sparkles, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Loan, CapitalSource, UserProfile } from '../../types';
import { processNaturalLanguageCommand } from '../../services/geminiService';

interface AIBalanceInsightProps {
    loans: Loan[];
    sources: CapitalSource[];
    activeUser: UserProfile | null;
}

export const AIBalanceInsight: React.FC<AIBalanceInsightProps> = ({ loans, sources, activeUser }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<string>('');
    const [userInput, setUserInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-análise estratégica ao abrir o balanço
    useEffect(() => {
        if (loans.length > 0 && !analysis && !isAnalyzing) {
            handleRunAnalysis("Gere uma auditoria severa da minha carteira. Aponte riscos críticos de inadimplência, vereditos sobre lucros e me diga quais contratos vão vencer amanhã.");
        }
    }, [loans.length]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [chatHistory, isAnalyzing]);

    const handleRunAnalysis = async (prompt: string, fromChat = false) => {
        if (isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const context = {
                totalLent: loans.reduce((acc, l) => acc + l.principal, 0),
                interestBalance: activeUser?.interestBalance || 0,
                lateCount: loans.filter(l => l.installments.some(i => i.status === 'LATE' && !l.isArchived)).length,
                topRisks: loans
                    .filter(l => l.installments.some(i => i.status === 'LATE' && !l.isArchived))
                    .map(l => ({ name: l.debtorName, debt: l.totalToReceive }))
                    .slice(0, 3)
            };

            const result = await processNaturalLanguageCommand(prompt, context);
            const aiText = result.analysis || result.feedback || "Tive um erro ao auditar os dados.";
            
            if (fromChat) {
                setChatHistory(prev => [...prev, { role: 'ai', text: aiText }]);
            } else {
                setAnalysis(aiText);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSendMessage = () => {
        if (!userInput.trim() || isAnalyzing) return;
        const msg = userInput;
        setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
        setUserInput('');
        handleRunAnalysis(msg, true);
    };

    return (
        <div className={`w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl transition-all duration-500 ${isMinimized ? 'h-24' : 'h-auto mt-8'}`}>
            {/* Header com Toggle */}
            <div 
                className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 p-6 border-b border-slate-800 flex items-center justify-between cursor-pointer"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20 animate-pulse">
                        <BrainCircuit size={20}/>
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-tighter">Auditoria em Tempo Real</h3>
                        <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Sparkles size={10}/> Chief Risk Officer IA
                        </p>
                    </div>
                </div>
                {isMinimized ? <ChevronDown size={18} className="text-slate-500"/> : <ChevronUp size={18} className="text-slate-500"/>}
            </div>

            {!isMinimized && (
                <>
                    <div className="flex-1 p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar bg-slate-950/30" ref={scrollRef}>
                        {analysis && (
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 mb-3 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                                    <ShieldAlert size={14}/> Veredito do Auditor
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                                    {analysis}
                                </p>
                            </div>
                        )}

                        {chatHistory.map((chat, idx) => (
                            <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] font-medium leading-relaxed ${chat.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-300 rounded-tl-none border border-slate-700'}`}>
                                    {chat.text}
                                </div>
                            </div>
                        ))}

                        {isAnalyzing && (
                            <div className="flex justify-start animate-pulse">
                                <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 flex items-center gap-2">
                                    <Loader2 className="animate-spin text-blue-500" size={14}/>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Processando Verbo...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-900 border-t border-slate-800">
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl flex items-center p-1 focus-within:border-blue-500/50 transition-all">
                            <input 
                                type="text" 
                                placeholder="Dúvida técnica ou estratégica sobre os dados?"
                                className="bg-transparent w-full p-3 text-white outline-none text-[11px] font-bold"
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={isAnalyzing || !userInput.trim()}
                                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50"
                            >
                                <Send size={14}/>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
