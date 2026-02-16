
import { useEffect, useRef } from 'react';

export const useExitGuard = (
  activeUser: any,
  activeTab: string,
  setActiveTab: (tab: any) => void,
  isPublicView: boolean,
  showToast: (msg: string, type?: any) => void
) => {
  const lastBackPress = useRef<number>(0);

  useEffect(() => {
    // Só ativa se estiver logado e não for visualização pública
    if (!activeUser || isPublicView) return;

    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      // Garante que sempre haja um estado no histórico para "voltar"
      // Isso cria a armadilha para o botão voltar
      window.history.pushState(null, '', window.location.href);

      const handlePopState = (e: PopStateEvent) => {
        // Previne o comportamento padrão imediato manipulando o histórico
        
        // CENÁRIO 1: Usuário não está na Dashboard
        // Ação: Voltar para a Dashboard
        if (activeTab !== 'DASHBOARD') {
          e.preventDefault();
          setActiveTab('DASHBOARD');
          // Empurra o estado de volta para manter a armadilha ativa para o próximo "voltar"
          window.history.pushState(null, '', window.location.href);
          return;
        }

        // CENÁRIO 2: Usuário está na Dashboard (Lógica de Saída)
        const now = Date.now();

        if (now - lastBackPress.current < 2000) {
          // Segundo toque rápido (< 2s)
          // PERMITE A SAÍDA:
          // Não fazemos pushState aqui. O evento popstate já removeu o último estado.
          // O navegador agora vai voltar para a página anterior ao app ou fechar o PWA.
        } else {
          // Primeiro toque
          lastBackPress.current = now;
          showToast('Toque novamente para sair', 'warning');
          // Empurra o estado de volta para impedir a saída imediata
          window.history.pushState(null, '', window.location.href);
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [activeUser, activeTab, isPublicView, showToast, setActiveTab]);
};
