import React, { useState, useEffect } from 'react';
import { MessageCircle, ChevronLeft, ShieldCheck, User } from 'lucide-react';
import { supportChatService } from '../../services/supportChat.service';
import { Modal } from '../../components/ui/Modal';
import { ChatContainer } from './ChatContainer';

export const OperatorSupportChat = ({
  activeUser,
  onClose
}: {
  activeUser: any;
  onClose: () => void;
}) => {
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
      {/* ✅ CORREÇÃO MOBILE:
          - remove altura fixa 650px
          - usa 90dvh no mobile
          - remove overflow-x (barra horizontal)
          - remove negative margin agressiva no mobile
      */}
      <div className="flex flex-col h-[90dvh] sm:h-[85dvh] -m-4 sm:-m-12 bg-slate-900 overflow-hidden overflow-x-hidden rounded-b-[2.5rem]">
        {/* LISTA DE CHATS */}
        <div
          className={`flex flex-col h-full w-full bg-slate-950 overflow-hidden ${
            selectedChat
              ? 'hidden md:flex md:w-1/3 md:border-r border-slate-800'
              : 'flex'
          }`}
        >
          {/* Header da Lista */}
          <div className="p-4 border-b border-slate-800 shrink-0">
            <div className="bg-emerald-600/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-3">
              <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest leading-none mb-1 truncate">
                  Central de Suporte
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase truncate">
                  Atendimentos Ativos: {chats.length}
                </p>
              </div>
            </div>
          </div>

          {/* Lista Scrollável */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-2 space-y-2">
            {chats.length === 0 ? (
              <div className="text-center py-16 opacity-40 flex flex-col items-center">
                <MessageCircle size={44} className="mb-4 text-blue-500" />
                <p className="text-xs font-black uppercase tracking-widest">
                  Nenhum chamado
                </p>
              </div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.loanId}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left relative overflow-hidden group ${
                    selectedChat?.loanId === chat.loanId
                      ? 'bg-blue-600/10 border border-blue-500/50'
                      : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-blue-500 font-black border border-slate-700 shrink-0 shadow-lg">
                    <User size={20} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-xs font-black text-white uppercase truncate pr-2">
                        {chat.clientName}
                      </p>
                      <span className="text-[9px] text-slate-500 font-mono shrink-0">
                        {new Date(chat.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-slate-400 truncate w-full pr-2">
                        {chat.lastMessage}
                      </p>

                      {chat.unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-black h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center rounded-full shadow-lg shadow-rose-900/40 shrink-0 animate-pulse">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* ✅ Empty state melhor no mobile quando há chats mas nenhum selecionado */}
          {chats.length > 0 && !selectedChat && (
            <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-950/60">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
                Toque em um atendimento para abrir a conversa
              </p>
            </div>
          )}
        </div>

        {/* ÁREA DE CHAT */}
        {selectedChat && (
          <div className="flex flex-col h-full absolute inset-0 bg-slate-900 md:relative md:flex-1 md:inset-auto z-10 animate-in slide-in-from-right duration-300 overflow-hidden">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-3 shrink-0 shadow-lg z-20">
              <button
                onClick={() => {
                  setSelectedChat(null);
                  loadChats();
                }}
                className="p-2 bg-slate-900 rounded-xl text-slate-400 hover:text-white border border-slate-800 transition-colors md:hidden"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black shrink-0">
                {selectedChat.clientName.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-white font-black uppercase text-xs tracking-widest truncate">
                  {selectedChat.clientName}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[9px] text-emerald-500 font-bold uppercase truncate">
                    Online • Contrato #{selectedChat.loanId.slice(0, 4)}
                  </p>
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
                placeholder="Digite sua mensagem..."
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};