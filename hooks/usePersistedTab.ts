
import { useEffect } from 'react';
import { AppTab } from '../types';

export const usePersistedTab = (
  activeTab: AppTab,
  setActiveTab: (tab: AppTab) => void
) => {
  useEffect(() => {
    const lastTab = localStorage.getItem('cm_last_tab');
    if (lastTab) setActiveTab(lastTab as AppTab);
  }, []);

  useEffect(() => {
    if (activeTab) localStorage.setItem('cm_last_tab', activeTab);
  }, [activeTab]);
};
