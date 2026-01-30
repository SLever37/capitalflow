
import React from 'react';
import { TrendingUp, Plus, Loader2, LayoutGrid, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '../types';
import { Tooltip } from '../components/ui/Tooltip';

interface HeaderBarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  activeUser: UserProfile | null;
  isLoadingData: boolean;
  onOpenNav: () => void;
  onNewLoan: () => void;
  isStealthMode: boolean;
  toggleStealthMode: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ 
  activeTab, setActiveTab, activeUser, isLoadingData, onOpenNav, onNewLoan, isStealthMode, toggleStealthMode 
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center justify-between w-full md:w-auto gap-3 sm:gap-6">
           <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('DASHBOARD')}>
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform flex-shrink-0"><TrendingUp className="text-white w-5 h-5 sm:w-6 sm:h-6" /></div>
              <div><h1 className="text-base sm:text-2xl font-black tracking-tighter uppercase leading-none">Capital<span className="text-blue-500">Flow</span></h1>{activeUser?.businessName && <p className="text-[10px] sm:text-xs text-emerald-400 font-extrabold uppercase tracking-widest mt-0.5 shadow-black drop-shadow-sm">{activeUser.businessName}</p>}</div>
           </div>
           
           {/* MOBILE CONTROLS */}
           <div className="flex items-center gap-3 md:hidden">
               <button onClick={toggleStealthMode} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isStealthMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  {isStealthMode ? <EyeOff size={18}/> : <Eye size={18}/>}
               </button>
               <button onClick={() => setActiveTab('PROFILE')} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                  {activeUser?.photo ? <img src={activeUser.photo} className="w-full h-full object-cover"/> : <span className="text-white font-bold">{activeUser?.name?.[0]}</span>}
               </button>
           </div>

           {isLoadingData && <Loader2 className="animate-spin text-blue-500 hidden md:block" />}
           <div className="h-8 w-px bg-slate-800 hidden md:block" />
           
           {/* DESKTOP CONTROLS */}
           <div className="hidden lg:flex items-center gap-4">
              <button onClick={() => setActiveTab('PROFILE')} className="flex items-center gap-3 bg-slate-900/50 p-2 pr-4 rounded-full border border-slate-800/50"><div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700">{activeUser?.photo ? <img src={activeUser.photo} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs font-bold">{activeUser?.name?.[0]}</div>}</div><div className="text-xs"><p className="text-white font-bold">{activeUser?.name?.split(' ')[0]}</p><p className="text-[9px] text-slate-500 uppercase font-black">@{activeUser?.email?.split('@')[0]}</p></div></button>
              
              <button onClick={toggleStealthMode} className={`p-3 rounded-xl transition-all shadow-lg group ${isStealthMode ? 'bg-indigo-600 text-white' : 'bg-slate-900 hover:bg-indigo-600 text-slate-400 hover:text-white'}`} title="Modo Privacidade">
                  {isStealthMode ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>

              <button onClick={onOpenNav} className="p-3 bg-slate-900 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl transition-all shadow-lg group"><LayoutGrid size={20} className="group-hover:scale-110 transition-transform"/></button>
           </div>
        </div>
        <nav className="hidden md:flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1">
           <button onClick={() => setActiveTab('DASHBOARD')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Painel</button>
           <button onClick={() => setActiveTab('CLIENTS')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'CLIENTS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Clientes</button>
           <button onClick={() => setActiveTab('SOURCES')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SOURCES' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Capital</button>
        </nav>
        
        <div className="hidden md:block">
            <Tooltip content="Adicionar novo registo" position="bottom">
                <button onClick={onNewLoan} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Novo Contrato
                </button>
            </Tooltip>
        </div>
      </div>
    </header>
  );
};
