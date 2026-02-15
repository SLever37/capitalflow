
import React, { useState } from 'react';
import { Search, MessageCircle, Users, Briefcase, ChevronRight } from 'lucide-react';

interface ChatSidebarProps {
    chats: any[];
    clients: any[];
    team: any[];
    selectedChat: any;
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    onSelectChat: (chat: any) => void;
    diffLabel: (ts: string) => string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
    chats, clients, team, selectedChat, searchTerm, setSearchTerm, onSelectChat, diffLabel 
}) => {
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'CLIENTS' | 'TEAM'>('ACTIVE');

    // Filtra a lista correta baseada na aba
    const getList = () => {
        if (activeTab === 'ACTIVE') return chats;
        if (activeTab === 'CLIENTS') return clients;
        if (activeTab === 'TEAM') return team;
        return [];
    };

    const displayList = getList();

    return (
        <div className={`
            flex flex-col w-full md:w-[380px] lg:w-[420px] bg-slate-950 border-r border-slate-800 transition-all duration-300
            ${selectedChat ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Header de Busca e Abas */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16}/>
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex bg-slate-900 p-1 rounded-xl">
                <button 
                    onClick={() => setActiveTab('ACTIVE')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'ACTIVE' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <MessageCircle size={12}/> Ativos
                </button>
                <button 
                    onClick={() => setActiveTab('CLIENTS')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'CLIENTS' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Users size={12}/> Clientes
                </button>
                <button 
                    onClick={() => setActiveTab('TEAM')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'TEAM' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Briefcase size={12}/> Equipe
                </button>
            </div>
          </div>

          {/* Lista de Chats/Contatos */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {displayList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                <Users size={32} className="mb-3 opacity-20"/>
                <p className="text-xs font-bold uppercase">Nada encontrado</p>
              </div>
            ) : (
              displayList.map((item: any) => {
                // Identificador único depende do tipo
                const key = item.loanId || item.profileId;
                const isActive = (selectedChat?.loanId === item.loanId) || (selectedChat?.profileId === item.profileId);
                
                return (
                  <button
                    key={key}
                    onClick={() => onSelectChat(item)}
                    className={`w-full p-4 rounded-xl flex items-start gap-3 transition-all border ${
                      isActive 
                        ? 'bg-blue-900/10 border-blue-500/30 shadow-md' 
                        : 'bg-transparent border-transparent hover:bg-slate-900 hover:border-slate-800'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border ${isActive ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {item.clientName?.charAt(0) || '?'}
                      </div>
                      {item.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-slate-950 animate-bounce">
                          {item.unreadCount}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`text-xs font-black uppercase truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {item.clientName}
                        </span>
                        {item.timestamp && (
                            <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-2">
                              {diffLabel(item.timestamp)}
                            </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                          <p className={`text-[11px] truncate leading-tight ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                            {item.lastMessage || 'Novo Contato'}
                          </p>
                          {activeTab !== 'ACTIVE' && <ChevronRight size={12} className="text-slate-600"/>}
                      </div>
                      
                      {item.type === 'ACTIVE' && (
                          <p className="text-[9px] text-slate-600 font-bold uppercase mt-1.5 tracking-wider">
                            Contrato #{item.loanId?.slice(0,6)}
                          </p>
                      )}
                      {item.type === 'CLIENT' && (
                          <p className="text-[9px] text-slate-600 font-bold uppercase mt-1.5 tracking-wider">
                            Doc: {item.debtorDocument || 'N/A'}
                          </p>
                      )}
                      {item.type === 'TEAM' && (
                          <p className="text-[9px] text-slate-600 font-bold uppercase mt-1.5 tracking-wider">
                            {item.role}
                          </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
    );
};
