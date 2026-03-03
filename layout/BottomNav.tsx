
import React from 'react';
import { LayoutDashboard, Users, Wallet, LayoutGrid, Plus, Briefcase, PiggyBank, ChevronLeft, Calendar, Calculator, ArrowRightLeft, Megaphone } from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenNav: () => void;
  onNewLoan: () => void;
  navOrder: string[];
  primaryColor?: string;
  isStaff?: boolean;
  onGoBack?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeTab, setActiveTab, onOpenNav, onNewLoan, navOrder, primaryColor = '#2563eb', isStaff, onGoBack
}) => {
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'DASHBOARD': return <LayoutDashboard size={20}/>;
      case 'CLIENTS': return <Users size={20}/>;
      case 'TEAM': return <Briefcase size={20}/>;
      case 'SOURCES': return <Wallet size={20}/>;
      case 'PERSONAL_FINANCE': return <PiggyBank size={20}/>;
      case 'AGENDA': return <Calendar size={20}/>;
      case 'SIMULATOR': return <Calculator size={20}/>;
      case 'FLOW': return <ArrowRightLeft size={20}/>;
      case 'ACQUISITION': return <Megaphone size={20}/>;
      default: return <LayoutGrid size={20}/>;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'DASHBOARD': return 'Painel';
      case 'CLIENTS': return 'Clientes';
      case 'TEAM': return 'Equipe';
      case 'SOURCES': return 'Fundos';
      case 'PERSONAL_FINANCE': return 'Finanças';
      case 'AGENDA': return 'Agenda';
      case 'SIMULATOR': return 'Simulador';
      case 'FLOW': return 'Extrato';
      case 'ACQUISITION': return 'Captação';
      default: return tab;
    }
  };

  // Lista completa de abas para a barra de tarefas mobile
  const mobileTabs = ['DASHBOARD', 'AGENDA', 'SIMULATOR', 'PERSONAL_FINANCE', 'ACQUISITION', 'FLOW', 'CLIENTS', 'SOURCES'];
  if (!isStaff) {
      mobileTabs.push('TEAM');
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 z-50 flex items-center p-2 pb-safe overflow-x-auto hide-scrollbar gap-2 px-4">
       {mobileTabs.map(tab => (
           <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-all shrink-0 ${activeTab === tab ? '' : 'text-slate-500'}`}
            style={{ color: activeTab === tab ? primaryColor : undefined }}
           >
               {getTabIcon(tab)}
               <span className="text-[9px] font-bold uppercase truncate w-full text-center">{getTabLabel(tab)}</span>
           </button>
       ))}
    </div>
  );
};
