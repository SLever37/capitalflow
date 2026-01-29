import { useEffect, useRef } from 'react';
import { Loan, LoanStatus } from '../types';
import { getDaysDiff } from '../utils/dateHelpers';
import { notificationService } from '../services/notification.service';
import { getInstallmentStatusLogic } from '../domain/finance/calculations';

export const useAppNotifications = (loans: Loan[], activeUser: any, showToast: any) => {
    // Fix: Using any instead of NodeJS.Timeout to avoid "Cannot find namespace 'NodeJS'" error in browser environments
    const checkTimer = useRef<any>(null);
    const lastPendingSignalsCount = useRef(0);

    const runScan = async () => {
        if (!activeUser || loans.length === 0) return;

        // Tenta garantir permissão silenciosa ou ignora
        await notificationService.requestPermission();

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

        // Alertas de Vencimento (Somente se houver algo novo relevante)
        if (countLateToday > 0) {
            notificationService.notify(
                "🔴 Cobranças Pendentes", 
                `Você tem ${countLateToday} contrato(s) que vencem hoje!`
            );
            showToast(`${countLateToday} parcelas vencem hoje. Verifique sua agenda.`, 'warning');
        } else if (countNearDue > 0) {
            showToast(`${countNearDue} parcelas vencem amanhã.`, 'info');
        }

        // Alertas de Mensagens/Sinais do Portal
        const currentPendingSignals = loans.flatMap(l => l.paymentSignals || []).filter(s => s.status === 'PENDENTE').length;
        if (currentPendingSignals > lastPendingSignalsCount.current) {
            notificationService.notify(
                "📩 Novo Comprovante",
                "Um cliente acabou de enviar um novo comprovante no Portal."
            );
            showToast("Nova sinalização de pagamento recebida!", "success");
        }
        lastPendingSignalsCount.current = currentPendingSignals;
    };

    useEffect(() => {
        if (!activeUser) return;

        // Primeira execução após carregar dados
        const delay = setTimeout(runScan, 3000);

        // Intervalo de verificação a cada 5 minutos
        checkTimer.current = setInterval(runScan, 300000);

        return () => {
            clearTimeout(delay);
            if (checkTimer.current) clearInterval(checkTimer.current);
        };
    }, [activeUser, loans.length]); // Depende do carregamento inicial dos loans

    return { manualCheck: runScan };
};