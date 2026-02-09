
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

    // Inicializa o estado do histórico preservando query params
    if (!window.history.state) {
      const currentQuery = window.location.search;
      window.history.replaceState({ tab: activeTab }, '', `${currentQuery}#${activeTab}`);
    }
  }, []);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('cm_last_tab', activeTab);
      
      const currentHash = window.location.hash;
      const currentSearch = window.location.search;
      
      // Sincroniza o hash da URL preservando os parâmetros de busca (?portal=...)
      if (currentHash !== `#${activeTab}`) {
        window.history.pushState({ tab: activeTab }, '', `${currentSearch}#${activeTab}`);
      }
    }
  }, [activeTab]);
};
