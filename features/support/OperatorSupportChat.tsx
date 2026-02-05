
import React, { useState, useEffect } from 'react';
import { MessageCircle, ChevronLeft, ShieldCheck, User, Users, X } from 'lucide-react';
import { supportChatService } from '../../services/supportChat.service';
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

    const handleFinishAtendimento = async () => {
        if (!selectedChat || !activeUser) return;
        if (!confirm("Encerrar este chamado?")) return;
        
        try {
            await supportChatService.finishChat(activeUser.id, selectedChat.loanId, activeUser.id);
            setSelectedChat(null);
            await loadChats();
        } catch (e) {
            alert("Erro ao finalizar.");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-0 sm:p-4 md:p-8 animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-screen-xl h-full sm:h-[90dvh] shadow-2xl relative overflow-hidden flex flex-col sm:rounded-[2.5rem] sm:border sm:border-slate-800">
                
                {/* Global Header */}
                <div className="h-14 sm:h-16 shrink-0 bg-slate-950 border-b border-slate-800 px-4 sm:px-8 flex justify-between items-center">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Users className="text-blue-500 shrink-0" size={20}/>
                        <h2 className="text-white font-black uppercase text-xs sm:text-sm tracking-tighter truncate">Terminal de Suporte</h2>
                    </div>
                    <button onClick={onClose} className="p-2 sm:p-3 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all">
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden min-h-0 relative">
                    {/* Sidebar / List */}
                    <div className={`
                        flex flex-col h-full bg-slate-900/50 shrink-0 border-r border-slate-800 transition-all duration-300
                        ${selectedChat ? 'hidden lg:flex lg:w-[350px] xl:w-[400px]' : 'flex w-full'}
                    `}>
                        <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest px-2 mb-2">Solicitações Ativas</p>
                            
                            {chats.length === 0 ? (
                                <div className="text-center py-20 opacity-20 flex flex-col items-center">
                                    <MessageCircle size={60} className="mb-4 text-slate-600"/>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Sem chamados</p>
                                </div>
                            ) : chats.map(chat => (
                                <button 
                                    key={chat.loanId} 
                                    onClick={() => setSelectedChat(chat)} 
                                    className={`w-full p-4 bg-slate-950 border rounded-2xl flex items-center justify-between hover:border-blue-500 transition-all group ${selectedChat?.loanId === chat.loanId ? 'border-blue-500 bg-slate-900 shadow-xl' : 'border-slate-800'}`}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400 font-black border border-slate-700 shrink-0 group-hover:scale-105 transition-transform">
                                            <User size={20}/>
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="text-xs font-black text-white uppercase truncate tracking-tight">{chat.clientName}</p>
                                            <p className="text-[10px] text-slate-500 truncate font-medium">{chat.lastMessage}</p>
                                        </div>
                                    </div>
                                    {chat.unreadCount > 0 && (
                                        <span className="bg-rose-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full animate-pulse shrink-0 ml-2">
                                            {chat.unreadCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className={`
                        flex-1 flex flex-col h-full bg-slate-900 transition-all duration-300
                        ${!selectedChat ? 'hidden lg:flex items-center justify-center' : 'flex w-full'}
                    `}>
                        {!selectedChat ? (
                            <div className="text-center space-y-4 opacity-10 select-none">
                                <ShieldCheck size={120} className="mx-auto text-slate-700"/>
                                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Aguardando Chamado</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full w-full overflow-hidden">
                                {/* Mobile Back Button */}
                                <div className="lg:hidden p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-3 shrink-0">
                                    <button onClick={() => setSelectedChat(null)} className="p-2 bg-slate-900 rounded-lg text-slate-400">
                                        <ChevronLeft size={20}/>
                                    </button>
                                    <p className="text-white font-black uppercase text-[10px] tracking-widest truncate">{selectedChat.clientName}</p>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ChatContainer 
                                        loanId={selectedChat.loanId} 
                                        profileId={activeUser.id} 
                                        operatorId={activeUser.id}
                                        senderType="OPERATOR"
                                        clientName={selectedChat.clientName}
                                        placeholder="Resposta profissional..."
                                        onFinish={handleFinishAtendimento}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
