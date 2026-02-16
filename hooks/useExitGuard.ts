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

  // 1. Anti-Saída Web (Confirmação ao fechar aba ou atualizar página)
  useEffect(() => {
    if (!activeUser || isPublicView) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Evita o prompt se estivermos saindo deliberadamente (logout)
      if (!activeUser) return;
      
      e.preventDefault();
      // A mensagem personalizada é ignorada pela maioria dos browsers modernos (mostram padrão)
      e.returnValue = 'Deseja realmente sair? Alterações não salvas podem ser perdidas.';
      return 'Deseja realmente sair?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeUser, isPublicView]);

  // 2. Proteção de Botão Voltar (Android PWA/WebView)
  useEffect(() => {
    if (!activeUser || isPublicView) return;

    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      // Cria uma entrada no histórico para "capturar" o primeiro clique no voltar
      window.history.pushState(null, '', window.location.href);

      const handlePopState = (e: PopStateEvent) => {
        // 1. Prioridade Máxima: Fechar Modais Abertos
        if (ui?.activeModal) {
          e.preventDefault();
          ui.closeModal();
          // Repõe o estado para capturar o próximo clique
          window.history.pushState(null, '', window.location.href);
          return;
        }

        // 2. Se estiver fora do Dashboard, volta para ele antes de sair
        if (activeTab !== 'DASHBOARD') {
          e.preventDefault();
          setActiveTab('DASHBOARD');
          window.history.pushState(null, '', window.location.href);
          return;
        }

        // 3. Lógica de Saída do App (Toque Duplo com Mensagem)
        const now = Date.now();
        const diff = now - lastBackPress.current;

        if (diff < 2000 && diff > 0) {
          // Segundo toque em menos de 2s: permite a saída (fecha a janela)
          // Em PWAs instalados, window.close() pode fechar o app
          window.close();
        } else {
          // Primeiro toque: mostra mensagem e bloqueia a saída
          lastBackPress.current = now;
          showToast('Pressione novamente para sair do CapitalFlow', 'warning');
          
          // Repõe o estado para "segurar" o usuário
          window.history.pushState(null, '', window.location.href);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [activeUser, activeTab, isPublicView, showToast, setActiveTab, ui?.activeModal]);
};
