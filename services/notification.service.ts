
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
      return permission === "granted";
    }
    return false;
  },

  /**
   * Dispara um alerta nativo compatível com Mobile e Desktop.
   */
  async notify(title: string, body: string, onClick?: () => void) {
    // Tenta tocar som primeiro
    playNotificationSound();

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const options: any = {
          body,
          icon: window.location.origin + '/favicon.ico',
          badge: window.location.origin + '/favicon.ico',
          tag: 'capitalflow-alert',
          renotify: true,
          vibrate: [200, 100, 200],
          silent: false,
          requireInteraction: false
        };

        const n = new Notification(title, options);

        n.onclick = (e) => {
            e.preventDefault();
            // Garante que a janela ganhe foco
            window.focus();
            if (onClick) {
                onClick();
            }
            // Cessa a mensagem imediatamente ao clicar
            n.close();
        };
      } catch (e) {
        console.warn("Falha ao disparar notificação nativa:", e);
      }
    }
  }
};