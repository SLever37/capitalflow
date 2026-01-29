// src/utils/notifications.ts

export const requestBrowserNotificationPermission = async () => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      // silencioso para não quebrar UX
    }
  }
};

export const fireBrowserNotification = (title: string, message: string) => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  } catch {
    // não quebra o app
  }
};