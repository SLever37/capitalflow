
import { useEffect, useRef } from 'react';

export const useExitGuard = (
  activeUser: any,
  activeTab: string,
  setActiveTab: (tab: any) => void,
  isPublicView: boolean,
  showToast: (msg: string, type?: any) => void,
  ui?: any // Adicionado ui para checar modais
) => {
  const lastBackPress = useRef<number>(0);

  useEffect(() => {
    if (!activeUser || isPublicView) return;

    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      window.history.pushState(null, '', window.location.href);

      const handlePopState = (e: PopStateEvent) => {
        // 1. Prioridade Máxima: Fechar Modais Abertos
        if (ui?.activeModal) {
          e.preventDefault();
          ui.closeModal();
          window.history.pushState(null, '', window.location.href);
          return;
        }

        // 2. Se não houver modal, volta para Dashboard
        if (activeTab !== 'DASHBOARD') {
          e.preventDefault();
          setActiveTab('DASHBOARD');
          window.history.pushState(null, '', window.location.href);
          return;
        }

        // 3. Lógica de Saída do App (Toque Duplo)
        const now = Date.now();
        if (now - lastBackPress.current < 2000) {
          // Permite saída real
        } else {
          lastBackPress.current = now;
          showToast('Toque novamente para sair', 'warning');
          window.history.pushState(null, '', window.location.href);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [activeUser, activeTab, isPublicView, showToast, setActiveTab, ui?.activeModal]);
};
