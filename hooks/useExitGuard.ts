import { useEffect, useRef } from 'react';

export const useExitGuard = (
  activeUser: any,
  activeTab: string,
  setActiveTab: (tab: any) => void,
  isPublicView: boolean,
  showToast: (msg: string, type?: any) => void,
  ui?: any 
) => {
  const lastBackPress = useRef<number>(0);

  // 1. Anti-Saída Web (Confirmação ao fechar aba)
  useEffect(() => {
    if (!activeUser || isPublicView) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Deseja realmente sair? Alterações não salvas podem ser perdidas.';
      return 'Deseja realmente sair?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeUser, isPublicView]);

  // 2. Proteção de Botão Voltar (Android)
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
          // Permite saída
          window.close();
        } else {
          lastBackPress.current = now;
          showToast('Toque novamente para sair do CapitalFlow', 'warning');
          window.history.pushState(null, '', window.location.href);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [activeUser, activeTab, isPublicView, showToast, setActiveTab, ui?.activeModal]);
};