
import React, { useState, useEffect } from 'react';
import { MessageCircle, ChevronLeft, ShieldCheck, User, Users, X, Briefcase, Search, PhoneCall } from 'lucide-react';
import { supportChatService } from '../../services/supportChat.service';
import { ChatContainer } from './ChatContainer';

export const OperatorSupportChat = ({ activeUser, onClose }: { activeUser: any, onClose: () => void }) => {
    const [chats, setChats] = useState<any[]>([]);
    const [teamChats, setTeamChats] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'CLIENTS' | 'TEAM'>('CLIENTS');
    const [searchTerm, setSearchTerm] = useState('');

    const loadChats = async () => {
        if (!activeUser) return;
        const allChats = await supportChatService.getActiveChats(activeUser.id);
        
        // Separa chats que são de equipe (definidos por um prefixo ou campo específico)
        // No CapitalFlow, usamos o ID do membro como loanId para conversas internas
        setChats(allChats.filter(c => !c.isTeamChat));
        setTeamChats(allChats.filter(c => c.isTeamChat));
    };

    useEffect(() => {
        loadChats();
    }, [activeUser.id]);

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

    const currentList = activeTab === 'CLIENTS' ? chats : teamChats;
    const filteredList = currentList.filter(c => c.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-0 sm:p-4 md:p-8 animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-screen-xl h-full sm:h-[90dvh] shadow-2xl relative overflow-hidden flex flex-col sm:rounded-[3rem] sm:border sm:border-slate-800">
                
                {/* Global Header */}
                <div className="h-14 sm:h-20 shrink-0 bg-slate-950 border-b border-slate-800 px-4 sm:px-8 flex justify-between items-center">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-900/40">
                            <MessageCircle size={24}/>
                        </div>
                        <div>
                            <h2 className="text-white font-black uppercase text-xs sm:text-lg tracking-tighter truncate leading-none">Centro de Comando Suporte</h2>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Comunicação Unificada</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all">
                        <X size={24}/>
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden min-h-0 relative">
                    {/* Sidebar / List */}
                    <div className={`
                        flex flex-col h-full bg-slate-900/50 shrink-0 border-r border-slate-800 transition-all duration-300
                        ${selectedChat ? 'hidden lg:flex lg:w-[350px] xl:w-[420px]' : 'flex w-full'}
                    `}>
                        {/* Tab Switcher */}
                        <div className="p-4 flex gap-2">
                            <button 
                                onClick={() => setActiveTab('CLIENTS')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'CLIENTS' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500'}`}
                            >
                                <Users size={14}/> Clientes
                            </button>
                            <button 
                                onClick={() => setActiveTab('TEAM')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'TEAM' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500'}`}
                            >
                                <Briefcase size={14}/> Equipe
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-4 mb-4">
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                                <Search size={14} className="text-slate-500 ml-2"/>
                                <input 
                                    type="text" 
                                    placeholder="Pesquisar..." 
                                    className="bg-transparent w-full text-xs text-white outline-none"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 pt-0">
                            {filteredList.length === 0 ? (
                                <div className="text-center py-20 opacity-20 flex flex-col items-center">
                                    <Search size={48} className="mb-4 text-slate-600"/>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nenhum registro</p>
                                </div>
                            ) : filteredList.map(chat => (
                                <button 
                                    key={chat.loanId} 
                                    onClick={() => setSelectedChat(chat)} 
                                    className={`w-full p-4 bg-slate-950 border rounded-2xl flex items-center justify-between hover:border-blue-500 transition-all group ${selectedChat?.loanId === chat.loanId ? 'border-blue-500 bg-slate-900 shadow-xl scale-[1.02]' : 'border-slate-800 opacity-70 hover:opacity-100'}`}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black border shrink-0 transition-transform group-hover:scale-105 ${activeTab === 'TEAM' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-blue-400 border-slate-700'}`}>
                                            {activeTab === 'TEAM' ? <Briefcase size={20}/> : <User size={20}/>}
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="text-xs font-black text-white uppercase truncate tracking-tight">{chat.clientName}</p>
                                            <p className="text-[10px] text-slate-500 truncate font-medium mt-0.5">{chat.lastMessage}</p>
                                        </div>
                                    </div>
                                    {chat.unreadCount > 0 && (
                                        <span className="bg-rose-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full animate-pulse shrink-0 ml-2 shadow-lg shadow-rose-900/40">
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
                            <div className="text-center space-y-6 opacity-10 select-none animate-pulse">
                                <ShieldCheck size={160} className="mx-auto text-slate-700"/>
                                <p className="text-xs font-black uppercase tracking-[0.6em] text-slate-500">Terminal Operacional Pronto</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full w-full overflow-hidden">
                                {/* Mobile Back Button */}
                                <div className="lg:hidden p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-4 shrink-0">
                                    <button onClick={() => setSelectedChat(null)} className="p-2 bg-slate-900 rounded-xl text-slate-400">
                                        <ChevronLeft size={24}/>
                                    </button>
                                    <div>
                                        <p className="text-white font-black uppercase text-xs tracking-widest truncate">{selectedChat.clientName}</p>
                                        <p className="text-[9px] text-emerald-500 font-bold uppercase">Ativo no Chat</p>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ChatContainer 
                                        loanId={selectedChat.loanId} 
                                        profileId={activeUser.id} 
                                        operatorId={activeUser.id}
                                        senderType="OPERATOR"
                                        clientName={selectedChat.clientName}
                                        placeholder={activeTab === 'TEAM' ? "Conversa com colaborador..." : "Resposta profissional ao cliente..."}
                                        onFinish={activeTab === 'CLIENTS' ? handleFinishAtendimento : undefined}
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
