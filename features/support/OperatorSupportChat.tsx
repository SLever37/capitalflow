import React, { useState, useEffect } from 'react';
import { MessageCircle, ChevronLeft, User, ShieldCheck } from 'lucide-react';
import { supportChatService } from '../../services/supportChat.service';
import { Modal } from '../../components/ui/Modal';
import { ChatContainer } from './ChatContainer';

export const OperatorSupportChat = ({ activeUser, onClose }: { activeUser: any, onClose: () => void }) => {
    const [chats, setChats] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any>(null);

    const loadChats = async () => {
        if (!activeUser) return;
        const data = await supportChatService.getActiveChats(activeUser.id);
        setChats(data);
    };

    useEffect(() => {
        loadChats();
    }, []);

    return (
        <Modal onClose={onClose} title="Atendimento ao Cliente">
            <div className="flex flex-col h-[550px] -m-6 sm:-m-12 bg-slate-900">
                {!selectedChat ? (
                    <div className="p-6 space-y-2 overflow-y-auto custom-scrollbar">
                        <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl mb-4 flex items-center gap-3">
                            <ShieldCheck className="text-blue-500"/>
                            <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Central de Suporte Unificada</p>
                        </div>
                        {chats.length === 0 ? (
                            <div className="text-center py-24 opacity-30">
                                <MessageCircle size={64} className="mx-auto mb-4 text-blue-500"/>
                                <p className="text-xs font-black uppercase tracking-widest">Nenhum chamado ativo</p>
                            </div>
                        ) : chats.map(chat => (
                            <button 
                                key={chat.loanId} 
                                onClick={() => setSelectedChat(chat)} 
                                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-blue-500 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-blue-500 font-black border border-slate-700">{chat.clientName[0]}</div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-white uppercase">{chat.clientName}</p>
                                        <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{chat.lastMessage}</p>
                                    </div>
                                </div>
                                {chat.unreadCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full animate-bounce shadow-lg shadow-rose-900/20">
                                        {chat.unreadCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-4">
                            <button onClick={() => { setSelectedChat(null); loadChats(); }} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft size={20}/>
                            </button>
                            <div>
                                <h3 className="text-white font-black uppercase text-xs tracking-widest">{selectedChat.clientName}</h3>
                                <p className="text-[10px] text-emerald-500 font-bold uppercase">Cliente Verificado</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChatContainer 
                                loanId={selectedChat.loanId} 
                                profileId={activeUser.id} 
                                senderType="OPERATOR"
                                placeholder="Responder ao cliente..."
                            />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};