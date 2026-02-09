
import { useEffect } from 'react';
import { AppTab } from '../types';

export const usePersistedTab = (
  activeTab: AppTab,
  setActiveTab: (tab: AppTab) => void
) => {
  useEffect(() => {
    // 1. Prioridade para o Hash na URL (Ex: #CLIENTS)
    const hash = window.location.hash.replace('#', '') as AppTab;
    const lastTab = localStorage.getItem('cm_last_tab') as AppTab;
    
    const tabs: AppTab[] = ['DASHBOARD', 'CLIENTS', 'TEAM', 'SOURCES', 'PROFILE', 'MASTER', 'LEGAL', 'PERSONAL_FINANCE'];
    
    if (hash && tabs.includes(hash)) {
      setActiveTab(hash);
    } else if (lastTab && tabs.includes(lastTab)) {
      setActiveTab(lastTab);
    }

    // Inicializa o estado do histórico para evitar fechar o browser no primeiro "voltar"
    if (!window.history.state) {
      window.history.replaceState({ tab: activeTab }, '', `#${activeTab}`);
    }
  }, []);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('cm_last_tab', activeTab);
      // Sincroniza o hash da URL sem disparar um novo evento de popstate
      if (window.location.hash !== `#${activeTab}`) {
        window.history.pushState({ tab: activeTab }, '', `#${activeTab}`);
      }
    }
  }, [activeTab]);
};
