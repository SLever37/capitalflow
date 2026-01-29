export const requestBrowserNotificationPermission = async (): Promise<NotificationPermission | null> => {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações.');
    return null;
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Erro ao solicitar permissão de notificação', err);
    return null;
  }
};

export const fireBrowserNotification = (
  title: string,
  options?: NotificationOptions
) => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options,
  });
};