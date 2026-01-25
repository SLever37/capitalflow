
import React from 'react';
import { NavHub } from './NavHub';
import { UserProfile } from '../types';

interface NavHubControllerProps {
  ui: any;
  setActiveTab: (tab: any) => void;
  activeUser: UserProfile | null;
}

export const NavHubController: React.FC<NavHubControllerProps> = ({ ui, setActiveTab, activeUser }) => {
  const handleNavNavigate = (tab: string, modal?: string) => {
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
    />
  );
};
