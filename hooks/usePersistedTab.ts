
import { useEffect } from 'react';

export const usePersistedTab = (
  activeTab: 'DASHBOARD' | 'CLIENTS' | 'SOURCES' | 'PROFILE' | 'MASTER' | 'LEGAL',
  setActiveTab: (tab: 'DASHBOARD' | 'CLIENTS' | 'SOURCES' | 'PROFILE' | 'MASTER' | 'LEGAL') => void
) => {
  useEffect(() => {
    const lastTab = localStorage.getItem('cm_last_tab');
    if (lastTab) setActiveTab(lastTab as any);
  }, []);

  useEffect(() => {
    if (activeTab) localStorage.setItem('cm_last_tab', activeTab);
  }, [activeTab]);
};
