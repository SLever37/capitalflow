
import React from 'react';
import { NavHub } from './NavHub';
import { UserProfile, AppTab } from '../types';
import { useCampaignNotifications } from '../hooks/useCampaignNotifications';

interface NavHubControllerProps {
  ui: any;
  setActiveTab: (tab: any) => void;
  activeUser: UserProfile | null;
  hubOrder: AppTab[];
}

export const NavHubController: React.FC<NavHubControllerProps> = ({ ui, setActiveTab, activeUser, hubOrder }) => {
  const { unreadCampaignCount, clearUnread } = useCampaignNotifications(activeUser);

  const handleNavNavigate = (tab: string, modal?: string) => {
      if (tab === 'ACQUISITION') {
          clearUnread();
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
