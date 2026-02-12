// hooks/usePersistedTab.ts
import { useEffect, useRef } from 'react';
import { AppTab } from '../types';

export const usePersistedTab = (
  activeTab: AppTab,
  setActiveTab: (tab: AppTab) => void
) => {
  const isFirstRender = useRef(true);

  // 🔹 Carrega aba persistida ao iniciar
  useEffect(() => {
    const lastTab = localStorage.getItem('cm_last_tab');
    if (lastTab && typeof lastTab === 'string') {
      setActiveTab(lastTab as AppTab);
    }
  }, [setActiveTab]);

  // 🔹 Salva sempre que a aba mudar (mas evita salvar na primeira renderização)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (activeTab) {
      localStorage.setItem('cm_last_tab', activeTab);
    }
  }, [activeTab]);
};