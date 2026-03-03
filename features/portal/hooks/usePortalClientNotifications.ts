
import { useState, useEffect } from 'react';

interface PortalNotificationState {
    show: boolean;
    message: string;
    type: 'WARNING' | 'INFO';
}

export const usePortalClientNotifications = (
    portalToken: string,
    stats: { overdueCount: number; maxDaysLate: number; nextDueDate: Date | null }
) => {
    const [notification, setNotification] = useState<PortalNotificationState | null>(null);

    useEffect(() => {
        if (!portalToken) return;

        const STORAGE_KEY = `portal:lastOverdueState:${portalToken}`;
        const lastStateStr = localStorage.getItem(STORAGE_KEY);
        const lastState = lastStateStr ? JSON.parse(lastStateStr) : { overdueCount: 0, maxDaysLate: 0 };

        let newMessage: PortalNotificationState | null = null;

        // 1. Detecta novo atraso (antes 0, agora > 0)
        if (stats.overdueCount > 0 && lastState.overdueCount === 0) {
            newMessage = {
                show: true,
                message: "Atenção: Existem parcelas vencidas. Valores atualizados com multa.",
                type: 'WARNING'
            };
        }
        // 2. Atraso agravou (mais parcelas ou mais dias)
        else if (stats.overdueCount > lastState.overdueCount || stats.maxDaysLate > lastState.maxDaysLate + 1) {
             newMessage = {
                show: true,
                message: "Seu débito acumulou novos dias de atraso. Regularize para evitar bloqueio.",
                type: 'WARNING'
            };
        }

        // Se houver notificação, exibe
        if (newMessage) {
            setNotification(newMessage);
            // Salva estado atual para não repetir
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                overdueCount: stats.overdueCount,
                maxDaysLate: stats.maxDaysLate,
                ts: Date.now()
            }));

            // Auto-hide após 6s
            const timer = setTimeout(() => setNotification(null), 6000);
            return () => clearTimeout(timer);
        }

    }, [portalToken, stats.overdueCount, stats.maxDaysLate]);

    return notification;
};
