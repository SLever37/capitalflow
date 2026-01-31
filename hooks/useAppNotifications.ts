
import { useEffect, useRef } from 'react';
import { Loan, LoanStatus, CapitalSource } from '../types';
import { getDaysDiff } from '../utils/dateHelpers'; 
import { notificationService } from '../services/notification.service';
import { getInstallmentStatusLogic } from '../domain/finance/calculations';

interface NotificationProps {
    loans: Loan[];
    sources: CapitalSource[];
    activeUser: any;
    showToast: any;
    setActiveTab: (tab: any) => void;
    setSelectedLoanId: (id: string | null) => void;
    disabled?: boolean; // Nova propriedade para controle de contexto
}

export const useAppNotifications = ({ 
    loans, sources, activeUser, showToast, setActiveTab, setSelectedLoanId, disabled
}: NotificationProps) => {
    const checkTimer = useRef<any>(null);
    const notifiedSignals = useRef<Set<string>>(new Set());
    const notifiedLowSources = useRef<Set<string>>(new Set());
    const notifiedDueLoans = useRef<Set<string>>(new Set());

    const runScan = async () => {
        // Bloqueio de Segurança: Se estiver desativado (Portal) ou sem usuário, não executa
        if (disabled || !activeUser) return;

        await notificationService.requestPermission();

        // 1. Monitorar Contratos Vencendo Hoje
        if (loans.length > 0) {
            loans.forEach(loan => {
                if (loan.isArchived) return;
                
                loan.installments.forEach(inst => {
                    const status = getInstallmentStatusLogic(inst);
                    if (status === LoanStatus.PAID) return;
                    
                    const diff = getDaysDiff(inst.dueDate);
                    
                    // Notifica apenas no dia do vencimento exato
                    if (diff === 0 && !notifiedDueLoans.current.has(inst.id)) {
                        notifiedDueLoans.current.add(inst.id);
                        
                        notificationService.notify(
                            "🔴 Vencimento Hoje", 
                            `O contrato de ${loan.debtorName} vence hoje. Clique para abrir.`,
                            () => {
                                setActiveTab('DASHBOARD');
                                setSelectedLoanId(loan.id);
                            }
                        );
                        
                        showToast(`Vencimento hoje: ${loan.debtorName}`, 'warning');
                    }
                });
            });
        }

        // 2. Monitorar Sinais do Portal (Comprovantes Pendentes)
        const pendingSignals = loans.flatMap(l => 
            (l.paymentSignals || [])
                .filter(s => s.status === 'PENDENTE')
                .map(s => ({ ...s, loanId: l.id, debtorName: l.debtorName }))
        );

        pendingSignals.forEach(signal => {
            if (signal.id && !notifiedSignals.current.has(signal.id)) {
                notifiedSignals.current.add(signal.id);
                
                notificationService.notify(
                    "📩 Novo Comprovante",
                    `${signal.debtorName} enviou um comprovante! Clique para conferir.`,
                    () => {
                        setActiveTab('DASHBOARD');
                        setSelectedLoanId(signal.loanId);
                    }
                );
                showToast(`Novo comprovante de ${signal.debtorName}`, "success");
            }
        });

        // 3. Monitorar Baixo Capital
        sources.forEach(source => {
            if (source.balance < 100 && !notifiedLowSources.current.has(source.id)) {
                notificationService.notify(
                    "⚠️ Saldo Crítico",
                    `A fonte "${source.name}" está com menos de R$ 100,00.`,
                    () => setActiveTab('SOURCES')
                );
                showToast(`Fonte ${source.name} com saldo muito baixo!`, 'error');
                notifiedLowSources.current.add(source.id);
            }
        });
    };

    useEffect(() => {
        if (!activeUser || disabled) return;
        const delay = setTimeout(runScan, 3000);
        checkTimer.current = setInterval(runScan, 300000);
        return () => {
            clearTimeout(delay);
            if (checkTimer.current) clearInterval(checkTimer.current);
        };
    }, [activeUser, loans.length, sources.length, disabled]);

    return { manualCheck: runScan };
};
