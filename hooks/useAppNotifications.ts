
import { useEffect, useRef } from 'react';
import { Loan, LoanStatus, CapitalSource } from '../types';
import { getDaysDiff } from '../utils/dateHelpers';
import { notificationService } from '../services/notification.service';

export const useAppNotifications = (loans: Loan[], sources: CapitalSource[], activeUser: any, showToast: any) => {
    const checkTimer = useRef<any>(null);
    const lastPendingSignalsCount = useRef(0);
    const notifiedLowSources = useRef<Set<string>>(new Set());

    const runScan = async () => {
        if (!activeUser) return;

        // 1. Pedir permissão de notificação nativa
        await notificationService.requestPermission();

        // 2. Monitorar Contratos Vencendo/Atrasados
        if (loans.length > 0) {
            let countLateToday = 0;
            let countNearDue = 0;

            loans.forEach(loan => {
                if (loan.isArchived) return;
                loan.installments.forEach(inst => {
                    if (inst.status === LoanStatus.PAID) return;
                    const diff = getDaysDiff(inst.dueDate);
                    if (diff === 0) countLateToday++;
                    else if (diff === -1) countNearDue++;
                });
            });

            if (countLateToday > 0) {
                notificationService.notify(
                    "🔴 Cobranças Pendentes", 
                    `Você tem ${countLateToday} contrato(s) vencendo hoje!`
                );
                showToast(`${countLateToday} parcelas vencem hoje. Alerta sonoro emitido.`, 'warning');
            }
        }

        // 3. Monitorar Sinais do Portal (Comprovantes)
        const currentPendingSignals = loans.flatMap(l => l.paymentSignals || []).filter(s => s.status === 'PENDENTE').length;
        if (currentPendingSignals > lastPendingSignalsCount.current) {
            notificationService.notify(
                "📩 Novo Comprovante",
                "Um cliente enviou um comprovante agora pelo Portal!"
            );
            showToast("Nova sinalização de pagamento recebida!", "success");
        }
        lastPendingSignalsCount.current = currentPendingSignals;

        // 4. Monitorar Baixo Capital (Recursos)
        sources.forEach(source => {
            if (source.balance < 100 && !notifiedLowSources.current.has(source.id)) {
                notificationService.notify(
                    "⚠️ Saldo Crítico",
                    `A fonte "${source.name}" está com menos de R$ 100,00.`
                );
                showToast(`Fonte ${source.name} com saldo muito baixo!`, 'error');
                notifiedLowSources.current.add(source.id);
            } else if (source.balance >= 100) {
                notifiedLowSources.current.delete(source.id);
            }
        });
    };

    useEffect(() => {
        if (!activeUser) return;

        // Escaneia 3 segundos após carregar o app
        const delay = setTimeout(runScan, 3000);

        // Repete o escaneamento a cada 5 minutos
        checkTimer.current = setInterval(runScan, 300000);

        return () => {
            clearTimeout(delay);
            if (checkTimer.current) clearInterval(checkTimer.current);
        };
    }, [activeUser, loans.length, sources.length]);

    return { manualCheck: runScan };
};
