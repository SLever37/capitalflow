import React from 'react';
import { LayoutDashboard, Users, Wallet, LayoutGrid, Plus } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenNav: () => void;
  onNewLoan: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, onOpenNav, onNewLoan }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 z-50 flex justify-around p-2 pb-safe">
       <button onClick={() => setActiveTab('DASHBOARD')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'text-blue-500' : 'text-slate-500'}`}><LayoutDashboard size={20}/><span className="text-[9px] font-bold uppercase">Painel</span></button>
       <button onClick={() => setActiveTab('CLIENTS')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'CLIENTS' ? 'text-blue-500' : 'text-slate-500'}`}><Users size={20}/><span className="text-[9px] font-bold uppercase">Clientes</span></button>
       <div className="relative -top-6"><button onClick={onNewLoan} className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-600/40"><Plus size={24}/></button></div>
       <button onClick={() => setActiveTab('SOURCES')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'SOURCES' ? 'text-blue-500' : 'text-slate-500'}`}><Wallet size={20}/><span className="text-[9px] font-bold uppercase">Fundos</span></button>
       <button onClick={onOpenNav} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'PROFILE' || activeTab === 'MASTER' ? 'text-blue-500' : 'text-slate-500'}`}><LayoutGrid size={20}/><span className="text-[9px] font-bold uppercase">Menu</span></button>
    </div>
  );
};