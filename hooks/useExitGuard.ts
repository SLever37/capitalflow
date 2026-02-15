
import { useEffect, useRef } from 'react';

export const useExitGuard = (
  activeUser: any,
  activeTab: string,
  isPublicView: boolean,
  showToast: (msg: string, type?: any) => void
) => {
  const lastBackPress = useRef<number>(0);

  useEffect(() => {
    // Só ativa se estiver logado e não for visualização pública
    if (!activeUser || isPublicView) return;

    const isAndroid = /Android/i.test(navigator.userAgent);

    // Lógica específica para Android (Botão Físico Voltar)
    if (isAndroid) {
      const handlePopState = () => {
        // Se não estiver na Dashboard, permite comportamento normal de voltar
        if (activeTab !== 'DASHBOARD') return;

        const now = Date.now();

        if (now - lastBackPress.current < 2000) {
          // Segundo toque rápido (< 2s): Permite a saída
          // O evento popstate já removeu o estado atual, então chamamos go(-1) para sair do app/página
          window.history.go(-1);
        } else {
          // Primeiro toque
          lastBackPress.current = now;
          showToast('Toque novamente para sair', 'warning');
          // Empurra o estado de volta para impedir a saída imediata
          window.history.pushState(null, '', window.location.href);
        }
      };

      // Adiciona estado inicial para ter o que "voltar"
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [activeUser, activeTab, isPublicView, showToast]);
};
