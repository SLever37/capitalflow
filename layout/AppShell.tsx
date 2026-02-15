import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';
import { HeaderBar } from './HeaderBar';
import { BottomNav } from './BottomNav';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { playNotificationSound } from '../utils/notificationSound';
import { notificationService } from '../services/notification.service';

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

  useEffect(() => {
    if (!activeUser || activeUser.id === 'DEMO') return;
    
    const fetchUnread = async () => {
        const { count } = await supabase
            .from('mensagens_suporte')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', activeUser.id)
            .eq('read', false)
            .neq('sender_user_id', activeUser.id); // Mensagens não enviadas por mim
        setUnreadSupport(count || 0);
    };

    fetchUnread();

    const channel = supabase.channel('support-notifications-main')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'mensagens_suporte', 
            filter: `profile_id=eq.${activeUser.id}` 
        }, (payload) => {
            // Se a mensagem não foi enviada por mim (evitar eco)
            if (payload.new.sender_user_id !== activeUser.id) {
                // Notificação Nativa (Push)
                notificationService.notify(
                    "Nova Mensagem",
                    payload.new.content || payload.new.text || "Mídia recebida no atendimento.",
                    () => {
                        window.focus();
                        onOpenSupport?.();
                    }
                );
                fetchUnread();
            }
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'mensagens_suporte',
            filter: `profile_id=eq.${activeUser.id}`
        }, () => fetchUnread())
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id]);

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

      {activeUser && (
          <button 
            onClick={onOpenSupport}
            className="fixed bottom-24 md:bottom-8 right-6 z-40 p-4 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:scale-110 transition-all active:scale-95 group"
          >
              <MessageSquare size={24}/>
              {unreadSupport > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full ring-4 ring-slate-950 animate-bounce">
                      {unreadSupport}
                  </span>
              )}
              <span className="absolute right-full mr-4 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-2xl">Atendimento Online</span>
          </button>
      )}

      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenNav={onOpenNav} 
        onNewLoan={onNewLoan}
        navOrder={navOrder}
        primaryColor={activeUser?.brandColor}
        isStaff={!!activeUser?.supervisor_id}
      />
    </div>
  );
};