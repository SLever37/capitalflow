
import React, { useState, useEffect } from 'react';
// Fix: Added missing X icon import from lucide-react
import { AlertCircle, AlertTriangle, CheckCircle2, MessageSquare, Briefcase, X } from 'lucide-react';
import { HeaderBar } from './HeaderBar';
import { BottomNav } from './BottomNav';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { playNotificationSound } from '../utils/notificationSound';
import { ChatContainer } from '../features/support/ChatContainer';
import { Modal } from '../components/ui/Modal';

interface AppShellProps {
  children: React.ReactNode;
  toast: { msg: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  activeUser: UserProfile | null;
  isLoadingData: boolean;
  onOpenNav: () => void;
  onNewLoan: () => void;
  isStealthMode: boolean;
  toggleStealthMode: () => void;
  onOpenSupport?: () => void;
  navOrder: string[];
}

export const AppShell: React.FC<AppShellProps> = ({ 
  children, toast, activeTab, setActiveTab, activeUser, isLoadingData, onOpenNav, onNewLoan, isStealthMode, toggleStealthMode, onOpenSupport, navOrder
}) => {
  const [unreadSupport, setUnreadSupport] = useState(0);
  const [isTeamChatOpen, setIsTeamChatOpen] = useState(false);

  useEffect(() => {
    if (!activeUser || activeUser.id === 'DEMO') return;
    
    const fetchUnread = async () => {
        const { count } = await supabase
            .from('mensagens_suporte')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', activeUser.supervisor_id || activeUser.id)
            .eq('sender', activeUser.supervisor_id ? 'OPERATOR' : 'CLIENT') // Se sou equipe, quero saber qtas o gestor mandou
            .eq('read', false);
        setUnreadSupport(count || 0);
    };

    fetchUnread();

    const channel = supabase.channel('support-notifications-global')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'mensagens_suporte', 
            filter: `profile_id=eq.${activeUser.supervisor_id || activeUser.id}` 
        }, (payload) => {
            const senderType = activeUser.supervisor_id ? 'OPERATOR' : 'CLIENT';
            if (payload.new.sender === senderType) {
                playNotificationSound();
                fetchUnread();
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id]);

  const handleOpenSupport = () => {
      if (activeUser?.supervisor_id) {
          // É membro da equipe -> Abre chat direto com supervisor
          setIsTeamChatOpen(true);
      } else {
          // É gestor -> Abre terminal de suporte
          onOpenSupport?.();
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-28 md:pb-12 text-slate-100 font-sans selection:bg-blue-600/30 relative">
      {toast && (
        <div className={`fixed z-[150] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 left-4 right-4 top-4 md:left-auto md:right-4 md:w-auto ${toast.type === 'error' ? 'bg-rose-600 text-white' : toast.type === 'warning' ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'}`}>
            {toast.type === 'error' ? <AlertCircle size={24}/> : toast.type === 'warning' ? <AlertTriangle size={24}/> : <CheckCircle2 size={24}/>}
            <span className="font-bold text-sm leading-tight">{toast.msg}</span>
        </div>
      )}

      <HeaderBar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeUser={activeUser} 
        isLoadingData={isLoadingData} 
        onOpenNav={onOpenNav} 
        onNewLoan={onNewLoan}
        isStealthMode={isStealthMode}
        toggleStealthMode={toggleStealthMode}
        navOrder={navOrder}
      />

      <main className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>

      {/* FAB SUPORTE / EQUIPE */}
      {activeUser && (
          <button 
            onClick={handleOpenSupport}
            className={`fixed bottom-24 md:bottom-8 right-6 z-40 p-4 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 group ${activeUser.supervisor_id ? 'bg-indigo-600 shadow-indigo-600/40' : 'bg-blue-600 shadow-blue-600/40'}`}
          >
              {activeUser.supervisor_id ? <Briefcase size={24}/> : <MessageSquare size={24}/>}
              {unreadSupport > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full ring-4 ring-slate-950 animate-bounce">
                      {unreadSupport}
                  </span>
              )}
              <span className="absolute right-full mr-4 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-2xl">
                  {activeUser.supervisor_id ? 'Falar com Supervisor' : 'Atendimento Online'}
              </span>
          </button>
      )}

      {/* Modal Chat Direto Equipe */}
      {isTeamChatOpen && activeUser && (
          <div className="fixed inset-0 z-[250] flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="relative w-full max-w-2xl bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-800 animate-in slide-in-from-right duration-500">
                  <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
                              <Briefcase size={20}/>
                          </div>
                          <div>
                              <p className="text-white font-black text-xs uppercase">Canal Interno de Equipe</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Comunicação Segura</p>
                          </div>
                      </div>
                      <button onClick={() => setIsTeamChatOpen(false)} className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-all"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <ChatContainer 
                        loanId={`team_${activeUser.id}`} 
                        profileId={activeUser.supervisor_id || ''} 
                        senderType="CLIENT" // Membro da equipe se comporta como remetente externo p/ o Supervisor
                        placeholder="Mensagem para o gestor..."
                      />
                  </div>
              </div>
          </div>
      )}

      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenNav={onOpenNav} 
        onNewLoan={onNewLoan}
        navOrder={navOrder}
        primaryColor={activeUser?.brandColor}
      />
    </div>
  );
};
