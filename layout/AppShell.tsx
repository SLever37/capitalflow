
import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Mic } from 'lucide-react';
import { HeaderBar } from './HeaderBar';
import { BottomNav } from './BottomNav';
import { UserProfile } from '../types';
import { useUiState } from '../hooks/useUiState'; // Necessário importar para usar no FAB, mas o AppShell recebe props.
// Como AppShell é UI pura, vamos passar a função via props.

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
  onOpenAssistant?: () => void; // Nova Prop
}

export const AppShell: React.FC<AppShellProps> = ({ 
  children, toast, activeTab, setActiveTab, activeUser, isLoadingData, onOpenNav, onNewLoan, isStealthMode, toggleStealthMode, onOpenAssistant
}) => {
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
      />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>

      {/* GLOBAL AI FAB */}
      {onOpenAssistant && (
          <button 
            onClick={onOpenAssistant}
            className="fixed z-[90] bottom-24 md:bottom-12 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center text-white hover:scale-110 transition-transform active:scale-95 border-2 border-white/10"
            title="Assistente IA"
          >
            <Mic size={28} />
          </button>
      )}

      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenNav={onOpenNav} 
        onNewLoan={onNewLoan}
      />
    </div>
  );
};
