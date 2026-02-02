
import React from 'react';
import { LayoutDashboard, Users, Wallet, LayoutGrid, Plus, Briefcase } from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenNav: () => void;
  onNewLoan: () => void;
  navOrder: string[];
  primaryColor?: string;
  isStaff?: boolean;
}

export const BottomNav: React.FC<BottomNavProps & { isStaff?: boolean }> = ({ 
  activeTab, setActiveTab, onOpenNav, onNewLoan, navOrder, primaryColor = '#2563eb', isStaff 
}) => {
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'DASHBOARD': return <LayoutDashboard size={20}/>;
      case 'CLIENTS': return <Users size={20}/>;
      case 'TEAM': return <Briefcase size={20}/>;
      case 'SOURCES': return <Wallet size={20}/>;
      default: return <LayoutGrid size={20}/>;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'DASHBOARD': return 'Painel';
      case 'CLIENTS': return 'Clientes';
      case 'TEAM': return 'Equipe';
      case 'SOURCES': return 'Fundos';
      default: return tab;
    }
  };

  // Filtra EQUIPE se o usuário for subordinado (staff)
  const safeNavOrder = (navOrder || []).filter(tab => !(tab === 'TEAM' && isStaff));

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 z-50 flex justify-around items-center p-2 pb-safe">
       {/* SLOTS 1 e 2 */}
       {safeNavOrder.slice(0, 2).map(tab => (
           <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === tab ? '' : 'text-slate-500'}`}
            style={{ color: activeTab === tab ? primaryColor : undefined }}
           >
               {getTabIcon(tab)}
               <span className="text-[9px] font-bold uppercase">{getTabLabel(tab)}</span>
           </button>
       ))}
       
       {/* BOTÃO CENTRAL PLUS */}
       <div className="relative -top-6">
            <button 
              onClick={onNewLoan} 
              className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 transition-all"
              style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}66` }}
            >
                <Plus size={24}/>
            </button>
       </div>

       {/* SLOT 3 (Ex: EQUIPE ou CAPITAL) */}
       {safeNavOrder.slice(2, 3).map(tab => (
           <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === tab ? '' : 'text-slate-500'}`}
            style={{ color: activeTab === tab ? primaryColor : undefined }}
           >
               {getTabIcon(tab)}
               <span className="text-[9px] font-bold uppercase">{getTabLabel(tab)}</span>
           </button>
       ))}

       {/* MENU HUB (Slot 4) - SEMPRE PRESENTE NO MOBILE */}
       <button 
          onClick={onOpenNav} 
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'PROFILE' || activeTab === 'MASTER' || activeTab === 'LEGAL' ? 'text-blue-500' : 'text-slate-500'}`}
       >
           <LayoutGrid size={20}/>
           <span className="text-[9px] font-bold uppercase">Menu</span>
       </button>
    </div>
  );
};
