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
  disabled?: boolean;
}

export const useAppNotifications = ({
  loans,
  sources,
  activeUser,
  showToast,
  setActiveTab,
  setSelectedLoanId,
  disabled,
}: NotificationProps) => {
  const checkTimer = useRef<any>(null);

  const permissionAsked = useRef(false);

  const notifiedSignals = useRef<Set<string>>(new Set());
  const notifiedLowSources = useRef<Set<string>>(new Set());
  const notifiedDueLoans = useRef<Set<string>>(new Set());

  const lastUserId = useRef<string | null>(null);

  const resetNotifiedCaches = () => {
    notifiedSignals.current = new Set();
    notifiedLowSources.current = new Set();
    notifiedDueLoans.current = new Set();
  };

  const runScan = async () => {
    if (disabled || !activeUser) return;

    // ✅ pede permissão 1 vez por sessão
    if (!permissionAsked.current) {
      permissionAsked.current = true;
      try {
        await notificationService.requestPermission();
      } catch {
        // ignora
      }
    }

    // 1) Contratos vencendo hoje
    if (loans?.length) {
      loans.forEach((loan) => {
        if (!loan || loan.isArchived) return;

        const installments = (loan as any).installments || [];
        installments.forEach((inst: any) => {
          if (!inst?.id || !inst?.dueDate) return;

          const status = getInstallmentStatusLogic(inst);
          if (status === LoanStatus.PAID) return;

          const diff = getDaysDiff(inst.dueDate);

          // Notifica apenas no dia do vencimento exato
          if (diff === 0 && !notifiedDueLoans.current.has(inst.id)) {
            notifiedDueLoans.current.add(inst.id);

            notificationService.notify(
              '🔴 Vencimento Hoje',
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

    // 2) Sinais do portal (comprovantes pendentes)
    const pendingSignals = (loans || []).flatMap((l: any) =>
      ((l?.paymentSignals || []) as any[])
        .filter((s) => s?.status === 'PENDENTE')
        .map((s) => ({ ...s, loanId: l.id, debtorName: l.debtorName }))
    );

    pendingSignals.forEach((signal: any) => {
      if (!signal?.id) return;

      if (!notifiedSignals.current.has(signal.id)) {
        notifiedSignals.current.add(signal.id);

        notificationService.notify(
          '📩 Novo Comprovante',
          `${signal.debtorName} enviou um comprovante! Clique para conferir.`,
          () => {
            setActiveTab('DASHBOARD');
            setSelectedLoanId(signal.loanId);
          }
        );

        showToast(`Novo comprovante de ${signal.debtorName}`, 'success');
      }
    });

    // 3) Baixo capital
    (sources || []).forEach((source: any) => {
      if (!source?.id) return;

      const balance = Number(source.balance || 0);
      if (balance < 100 && !notifiedLowSources.current.has(source.id)) {
        notificationService.notify(
          '⚠️ Saldo Crítico',
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

    // ✅ se trocou de usuário, zera caches e re-permite pedir permissão (se quiser)
    const currentId = String(activeUser?.id || '');
    if (lastUserId.current !== currentId) {
      lastUserId.current = currentId;
      resetNotifiedCaches();
      permissionAsked.current = false;
    }

    const delay = setTimeout(runScan, 3000);
    checkTimer.current = setInterval(runScan, 300000);

    return () => {
      clearTimeout(delay);
      if (checkTimer.current) clearInterval(checkTimer.current);
    };
  }, [activeUser, disabled, loans.length, sources.length]);

  return { manualCheck: runScan };
};