
import React from 'react';
import { Search, MessageCircle } from 'lucide-react';

interface ChatSidebarProps {
    chats: any[];
    selectedChat: any;
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    onSelectChat: (chat: any) => void;
    diffLabel: (ts: string) => string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
    chats, selectedChat, searchTerm, setSearchTerm, onSelectChat, diffLabel 
}) => {
    return (
        <div className={`
            flex flex-col w-full md:w-[380px] lg:w-[420px] bg-slate-950 border-r border-slate-800 transition-all duration-300
            ${selectedChat ? 'hidden md:flex' : 'flex'}
        `}>
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
            {chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                <MessageCircle size={32} className="mb-3 opacity-20"/>
                <p className="text-xs font-bold uppercase">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              chats.map((chat) => {
                const isActive = selectedChat?.loanId === chat.loanId;
                return (
                  <button
                    key={chat.loanId}
                    onClick={() => onSelectChat(chat)}
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
    );
};
