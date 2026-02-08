
import React, { useState, useEffect, useMemo } from 'react';
import { MessageCircle, ChevronLeft, ShieldCheck, User, X, Clock, Search, Filter } from 'lucide-react';
import { supportChatService } from '../services/supportChat.service';
import { ChatContainer } from './ChatContainer';

function diffLabel(ts: string | number | Date) {
  const t = typeof ts === 'string' || typeof ts === 'number' ? new Date(ts) : ts;
  const ms = Date.now() - t.getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `agora`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

// regra simples: online se houve atividade nos últimos X segundos
const ONLINE_WINDOW_SECONDS = 120; 

export const OperatorSupportChat = ({
  activeUser,
  onClose
}: {
  activeUser: any;
  onClose: () => void;
}) => {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadChats = async () => {
    if (!activeUser) return;
    const data = await supportChatService.getActiveChats(activeUser.id);
    setChats(data);
  };

  useEffect(() => {
    loadChats();
    // Polling leve para atualizar lista de conversas
    const interval = setInterval(loadChats, 10000);
    return () => clearInterval(interval);
  }, []);

  const statusInfo = useMemo(() => {
    if (!selectedChat?.timestamp) return { isOnline: false, label: 'Sem atividade' };
    const lastAt = new Date(selectedChat.timestamp).getTime();
    const secs = Math.floor((Date.now() - lastAt) / 1000);
    const isOnline = secs <= ONLINE_WINDOW_SECONDS;
    const label = isOnline ? 'Online Agora' : `Visto há ${diffLabel(selectedChat.timestamp)}`;
    return { isOnline, label };
  }, [selectedChat?.timestamp]);

  const filteredChats = useMemo(() => {
    return chats.filter(c => 
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.loanId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chats, searchTerm]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-300 font-sans">
      
      {/* TOP BAR - COMMAND CENTER STYLE */}
      <div className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
             <ShieldCheck size={20}/>
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider leading-none">Central de Atendimento</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Painel do Operador • {chats.length} Chamados</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2.5 bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-950/30 hover:border-rose-900 border border-slate-800 rounded-xl transition-all group"
          title="Fechar Painel"
        >
          <X size={18} className="group-hover:scale-110 transition-transform"/>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR - LISTA DE CONVERSAS */}
        <div className={`
            flex flex-col w-full md:w-[380px] lg:w-[420px] bg-slate-950 border-r border-slate-800 transition-all duration-300
            ${selectedChat ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Search Bar */}
          <div className="p-4 border-b border-slate-800">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16}/>
              <input 
                type="text" 
                placeholder="Buscar cliente ou contrato..." 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                <MessageCircle size={32} className="mb-3 opacity-20"/>
                <p className="text-xs font-bold uppercase">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isActive = selectedChat?.loanId === chat.loanId;
                return (
                  <button
                    key={chat.loanId}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-4 rounded-xl flex items-start gap-3 transition-all border ${
                      isActive 
                        ? 'bg-blue-900/10 border-blue-500/30 shadow-md' 
                        : 'bg-transparent border-transparent hover:bg-slate-900 hover:border-slate-800'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border ${isActive ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {chat.clientName.charAt(0)}
                      </div>
                      {chat.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-slate-950 animate-bounce">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`text-xs font-black uppercase truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {chat.clientName}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-2">
                          {diffLabel(chat.timestamp)}
                        </span>
                      </div>
                      <p className={`text-[11px] truncate leading-tight ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                        {chat.lastMessage}
                      </p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase mt-1.5 tracking-wider">
                        Contrato #{chat.loanId.slice(0,6)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ÁREA DE CHAT (MAIN) */}
        <div className={`flex-1 flex flex-col bg-slate-900 relative ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedChat ? (
            <>
              {/* Chat Header Mobile/Desktop */}
              <div className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold shrink-0">
                    {selectedChat.clientName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-white uppercase truncate">{selectedChat.clientName}</h2>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                        <p className={`text-[10px] font-bold uppercase ${statusInfo.isOnline ? 'text-emerald-500' : 'text-slate-500'}`}>
                            {statusInfo.label}
                        </p>
                    </div>
                  </div>
                </div>
                
                {/* Actions Placeholder */}
                <div className="flex gap-2">
                    {/* Add actions here like "View Contract" */}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-hidden relative">
                <ChatContainer
                  loanId={selectedChat.loanId}
                  profileId={activeUser.id}
                  operatorId={activeUser.id}
                  senderType="OPERATOR"
                  clientName={selectedChat.clientName}
                  placeholder="Digite sua resposta..."
                />
              </div>
            </>
          ) : (
            /* Empty State Desktop */
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 bg-slate-900/50">
              <div className="w-24 h-24 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6 border-2 border-dashed border-slate-700">
                 <MessageCircle size={40} className="opacity-50"/>
              </div>
              <h3 className="text-sm font-black uppercase text-white tracking-widest mb-2">Pronto para Atender</h3>
              <p className="text-xs text-slate-500 max-w-xs text-center">Selecione uma conversa na lista lateral para iniciar o atendimento ao cliente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};