
import { useEffect, useRef } from 'react';
import { Loan, LoanStatus, CapitalSource } from '../types';
import { getDaysDiff } from '../utils/dateHelpers';
import { notificationService } from '../services/notification.service';
import { getInstallmentStatusLogic } from '../domain/finance/calculations';

export const useAppNotifications = (loans: Loan[], sources: CapitalSource[], activeUser: any, showToast: any) => {
    const checkTimer = useRef<any>(null);
    const lastPendingSignalsCount = useRef(0);
    const notifiedLowSources = useRef<Set<string>>(new Set());
    const notifiedDueLoans = useRef<Set<string>>(new Set());

    const runScan = async () => {
        if (!activeUser) return;

        // 1. Pedir permissão de notificação nativa
        await notificationService.requestPermission();

        // 2. Monitorar Contratos Vencendo/Atrasados
        if (loans.length > 0) {
            let countLateToday = 0;
            const todayLoansIds: string[] = [];
            let clientName = "";

            loans.forEach(loan => {
                if (loan.isArchived) return; // Ignora arquivados
                
                loan.installments.forEach(inst => {
                    const status = getInstallmentStatusLogic(inst);
                    if (status === LoanStatus.PAID) return; // Ignora pagos
                    
                    const diff = getDaysDiff(inst.dueDate);
                    
                    // Alerta apenas se vence HOJE (0) e ainda não foi pago
                    if (diff === 0 && !notifiedDueLoans.current.has(inst.id)) {
                        countLateToday++;
                        todayLoansIds.push(inst.id);
                        notifiedDueLoans.current.add(inst.id);
                        clientName = loan.debtorName;
                    }
                });
            });

            if (countLateToday > 0) {
                notificationService.notify(
                    "🔴 Cobranças Pendentes", 
                    `Você tem ${countLateToday} contrato(s) vencendo hoje!`
                );
                
                const msg = countLateToday > 1 
                    ? `Atenção! Há ${countLateToday} empréstimos vencendo hoje.` 
                    : `Atenção! Há um empréstimo vencendo hoje - Cliente: ${clientName}.`;
                
                showToast(msg, 'warning');
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

        // Escaneia 5 segundos após carregar o app (dá tempo de carregar dados completos)
        const delay = setTimeout(runScan, 5000);

        // Repete o escaneamento a cada 10 minutos
        checkTimer.current = setInterval(runScan, 600000);

        return () => {
            clearTimeout(delay);
            if (checkTimer.current) clearInterval(checkTimer.current);
        };
    }, [activeUser, loans.length, sources.length]);

    return { manualCheck: runScan };
};
