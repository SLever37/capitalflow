
import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, X, FileText, Loader2, Check, CheckCheck, Hash, User } from 'lucide-react';
import { supportChatService, SupportMessage } from '../../services/supportChat.service';
import { supabase } from '../../lib/supabase';
import { playNotificationSound } from '../../utils/notificationSound';

interface ChatContainerProps {
    loanId: string;
    profileId: string; // ID do Owner
    operatorId?: string; // ID do Usuário Logado (Staff ou Owner)
    senderType: 'CLIENT' | 'OPERATOR';
    placeholder?: string;
    clientName?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ loanId, profileId, operatorId, senderType, placeholder, clientName }) => {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadMessages = async () => {
            const data = await supportChatService.getMessages(loanId);
            setMessages(data);
            await supportChatService.markAsRead(loanId, senderType);
        };
        loadMessages();

        const channel = supabase.channel(`chat-${loanId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_suporte', filter: `loan_id=eq.${loanId}` }, payload => {
                setMessages(prev => [...prev, payload.new as SupportMessage]);
                if (payload.new.sender !== senderType) playNotificationSound();
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [loanId]);

    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        setIsUploading(true);
        try {
            await supportChatService.sendMessage({
                profileId,
                loanId,
                sender: senderType,
                operator_id: operatorId, // Passa o ID de quem está digitando
                text: inputText
            });
            setInputText('');
        } catch (e) { alert("Erro ao enviar."); } finally { setIsUploading(false); }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950/20">
            <div className="bg-slate-900/80 p-3 border-b border-slate-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-blue-500 font-black border border-slate-700">
                        {senderType === 'CLIENT' ? 'S' : (clientName?.[0] || 'C')}
                    </div>
                    <div>
                        <p className="text-white font-bold text-[10px] uppercase">{senderType === 'CLIENT' ? 'Suporte Oficial' : clientName}</p>
                        <p className="text-[8px] text-slate-500 uppercase">Contrato #{loanId.slice(0,6).toUpperCase()}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4" ref={scrollRef}>
                {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === senderType ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${m.sender === senderType ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                            <p className="text-xs leading-relaxed">{m.text}</p>
                            <div className="flex items-center justify-end gap-1 mt-1 opacity-50 text-[8px] font-black uppercase">
                                {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                {m.sender === 'OPERATOR' && m.operator_id === operatorId && (
                                    <span title="Enviado por você">
                                        <User size={8} className="ml-1 text-blue-200" />
                                    </span>
                                )}
                                {m.sender === senderType && (m.read ? <CheckCheck size={10} className="text-emerald-400"/> : <Check size={10}/>)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="flex gap-2 items-center">
                    <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500" placeholder="Responder ao cliente..."/>
                    <button onClick={handleSend} disabled={isUploading || !inputText.trim()} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg">
                        {isUploading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                    </button>
                </div>
            </div>
        </div>
    );
};
