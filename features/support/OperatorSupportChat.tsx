
import React, { useState, useEffect } from 'react';
import { MessageCircle, ChevronLeft, ShieldCheck, User, Users } from 'lucide-react';
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
        <Modal onClose={onClose} title="Atendimento Profissional">
            <div className="flex flex-col h-[650px] max-h-[85dvh] -m-6 sm:-m-12 bg-slate-900 overflow-hidden rounded-b-[2.5rem]">
                {/* Lista de Chats (Visível se nenhum selecionado ou sempre em Desktop) */}
                <div className={`flex flex-col h-full ${selectedChat ? 'hidden md:flex' : 'flex'} w-full`}>
                    <div className="p-4 sm:p-6 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                        <div className="bg-emerald-600/10 border border-emerald-500/20 p-4 rounded-2xl mb-4 flex items-center gap-3">
                            <ShieldCheck className="text-emerald-500 shrink-0"/>
                            <div>
                                <p className="text-[10px] text-emerald-300 font-black uppercase tracking-widest leading-none mb-1">Central de Atendimento</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Suporte unificado via banco de dados.</p>
                            </div>
                        </div>
                        
                        {chats.length === 0 ? (
                            <div className="text-center py-24 opacity-30">
                                <MessageCircle size={64} className="mx-auto mb-4 text-blue-500"/>
                                <p className="text-xs font-black uppercase tracking-widest">Aguardando novos chamados...</p>
                            </div>
                        ) : chats.map(chat => (
                            <button 
                                key={chat.loanId} 
                                onClick={() => setSelectedChat(chat)} 
                                className={`w-full p-4 sm:p-5 bg-slate-950 border rounded-[2rem] flex items-center justify-between hover:border-blue-500 transition-all group ${selectedChat?.loanId === chat.loanId ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-800'}`}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-11 h-11 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-500 font-black border border-slate-700 shrink-0">
                                        <User size={20}/>
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="text-sm font-bold text-white uppercase truncate">{chat.clientName}</p>
                                        <p className="text-[10px] text-slate-500 truncate max-w-[150px] sm:max-w-[220px]">{chat.lastMessage}</p>
                                    </div>
                                </div>
                                {chat.unreadCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full animate-bounce shadow-lg shadow-rose-900/40 shrink-0 ml-2">
                                        {chat.unreadCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Área de Chat Selecionado (Mobile ocupa tudo, Desktop ao lado se quiser, mas aqui mantemos o modal limpo) */}
                {selectedChat && (
                    <div className={`flex flex-col h-full absolute inset-0 bg-slate-900 md:relative z-10 animate-in slide-in-from-right duration-300`}>
                        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-4">
                            <button onClick={() => { setSelectedChat(null); loadChats(); }} className="p-2.5 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft size={20}/>
                            </button>
                            <div className="min-w-0">
                                <h3 className="text-white font-black uppercase text-xs tracking-widest truncate">{selectedChat.clientName}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <p className="text-[9px] text-emerald-500 font-black uppercase">Atendimento em Curso</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChatContainer 
                                loanId={selectedChat.loanId} 
                                profileId={activeUser.id} 
                                operatorId={activeUser.id}
                                senderType="OPERATOR"
                                clientName={selectedChat.clientName}
                                placeholder="Responda aqui..."
                            />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
