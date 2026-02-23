
import React from 'react';
import { NavHub } from './NavHub';
import { UserProfile, AppTab } from '../types';
import { campaignRealtimeService } from '../services/campaignRealtime.service';
import { notificationService } from '../services/notification.service';

interface NavHubControllerProps {
  ui: any;
  setActiveTab: (tab: any) => void;
  activeUser: UserProfile | null;
  hubOrder: AppTab[];
}

export const NavHubController: React.FC<NavHubControllerProps> = ({ ui, setActiveTab, activeUser, hubOrder }) => {
  const [unreadCampaignCount, setUnreadCampaignCount] = React.useState(0);

  React.useEffect(() => {
    if (!activeUser) return;

    // Load initial count
    const saved = localStorage.getItem('unreadCampaignCount');
    if (saved) setUnreadCampaignCount(parseInt(saved));

    const cleanup = campaignRealtimeService.startCampaignNotifications({
        onNewLead: (lead) => {
            setUnreadCampaignCount(prev => {
                const newVal = prev + 1;
                localStorage.setItem('unreadCampaignCount', newVal.toString());
                return newVal;
            });
            notificationService.notify('Novo Lead!', `Novo lead cadastrado: ${lead.name || 'Sem nome'}`);
        },
        onNewMessage: (msg) => {
            setUnreadCampaignCount(prev => {
                const newVal = prev + 1;
                localStorage.setItem('unreadCampaignCount', newVal.toString());
                return newVal;
            });
            notificationService.notify('Nova Mensagem de Campanha', msg.message || 'Nova mensagem');
        }
    });

    return cleanup;
  }, [activeUser]);

  const handleNavNavigate = (tab: string, modal?: string) => {
      if (tab === 'ACQUISITION') {
          setUnreadCampaignCount(0);
          localStorage.setItem('unreadCampaignCount', '0');
      }

      setActiveTab(tab as any);
      ui.setShowNavHub(false);
      if (modal === 'AGENDA') ui.openModal('AGENDA');
      if (modal === 'CALC') ui.openModal('CALC');
      if (modal === 'FLOW') ui.openModal('FLOW');
  };

  if (!ui.showNavHub) return null;

  return (
    <NavHub 
        onClose={() => ui.setShowNavHub(false)} 
        onNavigate={handleNavNavigate} 
        userLevel={activeUser?.accessLevel || 0} 
        hubOrder={hubOrder}
        unreadCampaignCount={unreadCampaignCount}
    />
  );
};
