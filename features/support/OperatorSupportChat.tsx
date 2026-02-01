import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, ChevronLeft, Loader2, User } from 'lucide-react';
import { supportChatService, SupportMessage } from '../../services/supportChat.service';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/ui/Modal';

export const OperatorSupportChat = ({ activeUser, onClose }: { activeUser: any, onClose: () => void }) => {
    const [chats, setChats] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const loadChats = async () => {
        if (!activeUser) return;
        const data = await supportChatService.getActiveChats(activeUser.id);
        setChats(data);
    };

    const loadMessages = async (loanId: string) => {
        setIsLoading(true);
        const data = await supportChatService.getMessages(loanId);
        setMessages(data);
        setIsLoading(false);
        await supportChatService.markAsRead(loanId, 'OPERATOR');
        loadChats();
    };

    useEffect(() => {
        loadChats();
        const subscription = supabase
            .channel('operator-chat')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'mensagens_suporte', 
                filter: `profile_id=eq.${activeUser.id}` 
            }, 
            payload => {
                if (selectedChat && payload.new.loan_id === selectedChat.loanId) {
                    setMessages(prev => [...prev, payload.new as SupportMessage]);
                    supportChatService.markAsRead(selectedChat.loanId, 'OPERATOR');
                }
                loadChats();
            })
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    }, [selectedChat, activeUser?.id]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || !selectedChat) return;
        const text = inputText.trim();
        setInputText('');
        await supportChatService.sendMessage(activeUser.id, selectedChat.loanId, 'OPERATOR', text);
    };

    return (
        <Modal onClose={onClose} title="Central de Atendimento">
            <div className="flex flex-col h-[500px]">
                {!selectedChat ? (
                    <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
                        {chats.length === 0 ? (
                            <div className="text-center py-20 opacity-30">
                                <MessageCircle size={48} className="mx-auto mb-4"/>
                                <p className="text-xs font-bold uppercase tracking-widest">Nenhum chamado aberto</p>
                            </div>
                        ) : chats.map(chat => (
                            <button 
                                key={chat.loanId} 
                                onClick={() => { setSelectedChat(chat); loadMessages(chat.loanId); }} 
                                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-blue-500 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-blue-500 font-black">
                                        {chat.clientName[0]}
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <p className="text-sm font-bold text-white uppercase">{chat.clientName}</p>
                                        <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{chat.lastMessage}</p>
                                    </div>
                                </div>
                                {chat.unreadCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">
                                        {chat.unreadCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                        <button 
                            onClick={() => setSelectedChat(null)} 
                            className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase mb-4 hover:text-blue-400"
                        >
                            <ChevronLeft size={14}/> Voltar para Lista
                        </button>
                        <div className="flex-1 bg-slate-950/50 rounded-3xl p-4 overflow-y-auto custom-scrollbar mb-4 space-y-3" ref={scrollRef}>
                            {isLoading ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500"/></div>
                            ) : messages.map(m => (
                                <div key={m.id} className={`flex ${m.sender === 'OPERATOR' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium ${m.sender === 'OPERATOR' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                        {m.text}
                                        <div className="flex justify-end mt-1 opacity-50 text-[8px] font-bold">
                                            {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={inputText} 
                                onChange={e => setInputText(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleSend()} 
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500 transition-all" 
                                placeholder="Responder ao cliente..."
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={!inputText.trim()}
                                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50"
                            >
                                <Send size={18}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};