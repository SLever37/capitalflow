
import { playNotificationSound } from '../utils/notificationSound';

export const notificationService = {
  /**
   * Solicita permissão de notificação de forma explícita.
   */
  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) return false;
    
    if (Notification.permission === "granted") return true;
    
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        // Tenta registrar o push logo após ganhar permissão
        await this.subscribeToPush();
        return true;
      }
    }
    return false;
  },

  /**
   * Subscreve o usuário para notificações push reais (se houver VAPID_KEY)
   */
  async subscribeToPush() {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Aqui o usuário precisaria configurar uma VAPID_KEY no .env
      const vapidKey = process.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidKey) {
        console.warn("[PUSH] VAPID_PUBLIC_KEY não configurada. Push real desativado.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });

      console.log("[PUSH] Usuário subscrito:", subscription);
      // Aqui você enviaria a 'subscription' para o seu backend/supabase
      // Ex: await supabase.from('user_push_subscriptions').upsert({ ... })
      
    } catch (e) {
      console.error("[PUSH] Erro ao subscrever:", e);
    }
  },

  /**
   * Dispara um alerta nativo de Extrema Importância.
   */
  async notify(title: string, body: string, onClick?: () => void) {
    // 1. Som de Alerta (Sempre toca, independente da permissão visual)
    playNotificationSound();

    // 2. Notificação Visual Nativa
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        // Tenta focar a janela se estiver oculta
        if (document.hidden) {
            window.focus(); 
        }

        const options: any = {
          body,
          icon: '/favicon.ico', // Caminho absoluto para garantir carregamento
          badge: '/favicon.ico',
          tag: 'capitalflow-critical', // Tag fixa para agrupar alertas críticos
          renotify: true, // Garante que vibre/toque novamente mesmo se houver outra notificação
          requireInteraction: true, // Mantém na tela até o usuário interagir
          silent: false,
          vibrate: [200, 100, 200, 100, 200] // Padrão de vibração urgente
        };

        try {
          const n = new Notification(title, options);

          n.onclick = (e) => {
              e.preventDefault();
              window.focus();
              if (onClick) {
                  onClick();
              }
              n.close();
          };
        } catch (err: any) {
          if (err.name === 'TypeError' || err.message.includes('Illegal constructor')) {
            navigator.serviceWorker?.getRegistration().then(registration => {
              if (registration) {
                registration.showNotification(title, options);
              }
            });
          } else {
            throw err;
          }
        }
      } catch (e) {
        console.warn("Falha ao disparar notificação nativa:", e);
      }
    }
  }
};
