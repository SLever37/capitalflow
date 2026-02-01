import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Loader2 } from 'lucide-react';
import { supportChatService, SupportMessage } from '../../../services/supportChat.service';
import { supabase } from '../../../lib/supabase';

interface PortalChatDrawerProps {
    loan: any;
    isOpen: boolean;
    onClose: () => void;
}

export const PortalChatDrawer: React.FC<PortalChatDrawerProps> = ({ loan, isOpen, onClose }) => {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const loadMessages = async () => {
        if (!loan?.id) return;
        setIsLoading(true);
        try {
            const data = await supportChatService.getMessages(loan.id);
            setMessages(data);
            await supportChatService.markAsRead(loan.id, 'CLIENT');
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && loan?.id) {
            loadMessages();
            const channel = supabase.channel(`portal-chat-${loan.id}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'mensagens_suporte', 
                    filter: `loan_id=eq.${loan.id}` 
                }, 
                payload => {
                    setMessages(prev => [...prev, payload.new as SupportMessage]);
                    if (payload.new.sender === 'OPERATOR') {
                        supportChatService.markAsRead(loan.id, 'CLIENT');
                    }
                })
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [isOpen, loan?.id]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || !loan?.id) return;
        const text = inputText.trim();
        setInputText('');
        await supportChatService.sendMessage(loan.profile_id, loan.id, 'CLIENT', text);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex justify-end">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-sm bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white">
                            <MessageSquare size={20}/>
                        </div>
                        <div>
                            <h3 className="text-white font-black uppercase text-xs tracking-tighter">Atendimento</h3>
                            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Gestor Online</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-900 text-slate-500 rounded-lg hover:text-white transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4" ref={scrollRef}>
                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                            Olá! Use este chat para falar diretamente com o seu gestor de contrato. Suas mensagens serão respondidas em breve.
                        </p>
                    </div>

                    {isLoading && messages.length === 0 ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500"/></div>
                    ) : messages.map(m => (
                        <div key={m.id} className={`flex ${m.sender === 'CLIENT' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm ${m.sender === 'CLIENT' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                {m.text}
                                <div className="flex justify-end mt-1 opacity-50 text-[8px] font-black uppercase">
                                    {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={inputText} 
                            onChange={e => setInputText(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSend()} 
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500 transition-all" 
                            placeholder="Sua dúvida ou solicitação..."
                        />
                        <button 
                            onClick={handleSend} 
                            disabled={!inputText.trim()}
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                            <Send size={18}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};