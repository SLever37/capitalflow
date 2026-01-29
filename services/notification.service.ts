
import { playNotificationSound } from '../utils/notificationSound';

export const notificationService = {
  /**
   * Solicita permissão de notificação se ainda não decidida.
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
   * Dispara um alerta nativo e sonoro.
   */
  async notify(title: string, body: string) {
    // Alerta sonoro sempre (se houver interação prévia do usuário)
    playNotificationSound();

    // Notificação de sistema
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'capitalflow-alert'
        });
      } catch (e) {
        console.warn("Falha ao disparar notificação nativa:", e);
      }
    }
  }
};
