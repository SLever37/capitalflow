import React from 'react';
import { TrendingUp, Loader2, ShieldCheck, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const LoadingScreen: React.FC = () => {
  const handleCancelLoading = async () => {
    try {
      // Limpeza profunda
      localStorage.removeItem('cm_session');
      localStorage.removeItem('cm_last_tab');
      localStorage.removeItem('cm_cache_null'); // Previne cache fantasma
      
      // Tenta deslogar do Supabase se houver algo pendente
      await supabase.auth.signOut().catch(() => {});
    } finally {
      // Força recarregamento limpo na raiz
      window.location.href = '/';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[9999]">
      <div className="relative mb-8">
         {/* Efeito de Glow */}
         <div className="absolute inset-0 bg-blue-600 blur-[60px] opacity-20 animate-pulse rounded-full"></div>
         
         {/* Ícone Central */}
         <div className="relative bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-2xl shadow-black/50">
            <TrendingUp size={64} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
         </div>
      </div>

      {/* Título da Marca */}
      <h1 className="text-4xl font-black text-white tracking-tighter mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
        CAPITAL<span className="text-blue-600">FLOW</span>
      </h1>

      {/* Indicador de Carregamento */}
      <div className="flex flex-col items-center gap-4 mt-8 animate-in fade-in duration-1000 delay-200">
         <div className="flex items-center gap-3 bg-slate-900/50 px-6 py-3 rounded-full border border-slate-800/50 backdrop-blur-md">
            <Loader2 size={16} className="text-blue-500 animate-spin" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Sistema...</span>
         </div>

         {/* Botão de Escape para evitar carregamento infinito */}
         <button 
            onClick={handleCancelLoading}
            className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-rose-500 transition-colors uppercase tracking-widest px-4 py-2 rounded-xl bg-slate-900/30 border border-slate-800/50 mt-4"
         >
            <LogOut size={12}/> Voltar ao Login
         </button>
      </div>

      {/* Footer de Segurança */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2 opacity-50 animate-in fade-in duration-1000 delay-500">
        <ShieldCheck size={18} className="text-emerald-500"/>
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">
            Ambiente Criptografado
        </p>
      </div>
    </div>
  );
};