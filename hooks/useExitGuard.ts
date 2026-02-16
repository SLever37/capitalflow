import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const useExitGuard = (
  activeUser: any,
  activeTab: string,
  setActiveTab: (tab: any) => void,
  isPublicView: boolean,
  showToast: (msg: string, type?: any) => void,
  ui?: any 
) => {
  const lastBackPress = useRef<number>(0);

  // 1. Proteção Web (Confirmação ao fechar aba/recarregar)
  useEffect(() => {
    if (!activeUser || isPublicView) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!activeUser) return;
      e.preventDefault();
      e.returnValue = 'As alterações não salvas serão perdidas. Deseja realmente sair?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeUser, isPublicView]);

  // 2. Proteção de Botão Voltar (Android PWA / Mobile Browser)
  useEffect(() => {
    if (!activeUser || isPublicView) return;

    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // Injeta um estado falso no histórico para capturar o primeiro clique no voltar
    window.history.pushState({ anchor: true }, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      // Prioridade 1: Fechar Modais Abertos
      if (ui?.activeModal) {
        ui.closeModal();
        window.history.pushState({ anchor: true }, '', window.location.href);
        return;
      }

      // Prioridade 2: Se não estiver no Dashboard, volta para ele
      if (activeTab !== 'DASHBOARD') {
        setActiveTab('DASHBOARD');
        window.history.pushState({ anchor: true }, '', window.location.href);
        return;
      }

      // Prioridade 3: Lógica de Saída (Duplo Clique)
      const now = Date.now();
      const diff = now - lastBackPress.current;

      if (diff < 2000 && lastBackPress.current !== 0) {
        // Segundo clique em menos de 2s: permite sair
        // Como navegadores não permitem fechar janelas que não foram abertas por script,
        // redirecionamos ou simplesmente deixamos o histórico seguir (que sairá do app).
        if (isAndroid && window.matchMedia('(display-mode: standalone)').matches) {
            // Em PWA instalado, tentamos fechar
            window.close();
        }
      } else {
        // Primeiro clique: Avisa o usuário e "segura" no app
        lastBackPress.current = now;
        showToast('Pressione novamente para sair do CapitalFlow', 'warning');
        window.history.pushState({ anchor: true }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeUser, activeTab, isPublicView, showToast, setActiveTab, ui]);
};