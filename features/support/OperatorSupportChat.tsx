
import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, X, ChevronLeft, MessageCircle, Lock, Unlock } from 'lucide-react';
import { supportChatService } from '../../services/supportChat.service';
import { ChatContainer } from './ChatContainer';
import { ChatSidebar } from './components/ChatSidebar';
import { useSupportRealtime } from './hooks/useSupportRealtime';

function diffLabel(ts: string | number | Date) {
  if (!ts) return '';
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

// Wrapper interno para ter acesso ao hook realtime dentro do chat selecionado
const ActiveChatWrapper = ({ loanId, activeUser, clientName }: any) => {
    const { updateTicketStatus, ticketStatus } = useSupportRealtime(loanId, activeUser.id, 'OPERATOR');

    return (
        <div className="flex-1 flex flex-col relative min-h-0">
             {/* Header de Ação Rápida */}
             <div className="absolute top-14 right-4 z-20">
                <button 
                    onClick={() => updateTicketStatus(ticketStatus === 'OPEN' ? 'CLOSED' : 'OPEN')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase backdrop-blur-md shadow-lg border transition-all flex items-center gap-1 ${ticketStatus === 'OPEN' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'}`}
                >
                    {ticketStatus === 'OPEN' ? <><Lock size={12}/> Encerrar Chamado</> : <><Unlock size={12}/> Reabrir Chamado</>}
                </button>
             </div>

             <ChatContainer
                loanId={loanId}
                profileId={activeUser.id}
                operatorId={activeUser.id}
                senderType="OPERATOR"
                clientName={clientName}
                placeholder="Digite sua resposta..."
            />
        </div>
    );
};

export const OperatorSupportChat = ({ activeUser, onClose }: { activeUser: any; onClose: () => void; }) => {
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Identificação do dono para buscar dados corretos
  const ownerId = activeUser.supervisor_id || activeUser.id;

  const loadAllData = async () => {
    if (!activeUser) return;
    
    // 1. Chats Ativos
    const actives = await supportChatService.getActiveChats(activeUser.id);
    setActiveChats(actives);

    // 2. Contratos (Clientes)
    const clients = await supportChatService.getAvailableContracts(ownerId);
    setContracts(clients);

    // 3. Equipe
    const team = await supportChatService.getTeamMembers(ownerId);
    setTeamMembers(team);
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 15000); // Polling mais lento para dados gerais
    return () => clearInterval(interval);
  }, [activeUser.id]);

  // Filtros de busca para cada lista
  const filteredActive = useMemo(() => activeChats.filter(c => c.clientName.toLowerCase().includes(searchTerm.toLowerCase())), [activeChats, searchTerm]);
  const filteredClients = useMemo(() => contracts.filter(c => c.clientName.toLowerCase().includes(searchTerm.toLowerCase())), [contracts, searchTerm]);
  const filteredTeam = useMemo(() => teamMembers.filter(t => t.clientName.toLowerCase().includes(searchTerm.toLowerCase())), [teamMembers, searchTerm]);

  const handleSelectContact = (contact: any) => {
      // Se for cliente (contrato) ou ativo, usa loanId
      // Se for equipe, ainda não implementado full (placeholder)
      if (contact.type === 'TEAM') {
          alert("Chat interno de equipe em breve.");
          return;
      }
      
      // Se selecionou um cliente da lista que JÁ tem chat ativo, muda para o chat ativo
      const existingChat = activeChats.find(c => c.loanId === contact.loanId);
      if (existingChat) {
          setSelectedChat(existingChat);
      } else {
          // Cria objeto de chat temporário para iniciar conversa
          setSelectedChat({
              loanId: contact.loanId,
              clientName: contact.clientName,
              type: 'ACTIVE'
          });
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-300 font-sans h-[100dvh]">
      
      {/* HEADER */}
      <div className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
             <ShieldCheck size={20}/>
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider leading-none">Central de Atendimento</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Painel do Operador</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2.5 bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-950/30 hover:border-rose-900 border border-slate-800 rounded-xl transition-all group">
          <X size={18} className="group-hover:scale-110 transition-transform"/>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR COM ABAS */}
        <ChatSidebar 
            chats={filteredActive}
            clients={filteredClients}
            team={filteredTeam}
            selectedChat={selectedChat}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onSelectChat={handleSelectContact}
            diffLabel={diffLabel}
        />

        {/* ÁREA DE CHAT */}
        <div className={`flex-1 flex flex-col bg-slate-900 relative ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedChat ? (
            <>
              {/* TopBar Chat */}
              <div className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                    <ChevronLeft size={24} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold shrink-0">
                    {selectedChat.clientName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-white uppercase truncate">{selectedChat.clientName}</h2>
                    <p className="text-[10px] text-slate-500 font-mono">Contrato: {selectedChat.loanId.slice(0,8)}</p>
                  </div>
                </div>
              </div>

              {/* Wrapper Ativo com Lógica Realtime */}
              <ActiveChatWrapper 
                  loanId={selectedChat.loanId} 
                  activeUser={activeUser}
                  clientName={selectedChat.clientName}
              />
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 bg-slate-900/50">
              <div className="w-24 h-24 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6 border-2 border-dashed border-slate-700">
                 <MessageCircle size={40} className="opacity-50"/>
              </div>
              <h3 className="text-sm font-black uppercase text-white tracking-widest mb-2">Pronto para Atender</h3>
              <p className="text-xs text-slate-500 max-w-xs text-center">Selecione um cliente ou conversa na lista lateral para iniciar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
