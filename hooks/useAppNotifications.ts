
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, LoanStatus, CapitalSource } from '../types';
import { getDaysDiff } from '../utils/dateHelpers';
import { notificationService } from '../services/notification.service';
import { getInstallmentStatusLogic } from '../domain/finance/calculations';
import { playNotificationSound } from '../utils/notificationSound';

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
  const notifiedDueLoans = useRef<Set<string>>(new Set());
  const lastUserId = useRef<string | null>(null);

  const resetNotifiedCaches = () => {
    notifiedDueLoans.current = new Set();
  };

  // 1. Monitoramento em Tempo Real (Eventos Críticos de Negócio)
  useEffect(() => {
    if (!activeUser || disabled) return;

    const channel = supabase.channel('global-urgent-alerts')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'payment_intents', 
          filter: `profile_id=eq.${activeUser.id}` 
        },
        (payload) => {
          const newIntent = payload.new;
          if (newIntent.status === 'PENDENTE') {
             notificationService.notify(
                'Intencao de Pagamento Recebida!',
                'Um cliente enviou uma intencao de pagamento. Clique para validar.',
                () => {
                   setActiveTab('DASHBOARD');
                   setSelectedLoanId(newIntent.loan_id);
                }
             );
             showToast('Nova intencao de pagamento recebida! Verifique agora.', 'success');
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'payment_intents', 
          filter: `profile_id=eq.${activeUser.id}` 
        },
        (payload) => {
          const updatedIntent = payload.new;
          if (updatedIntent.status === 'APROVADO') {
             showToast('Intencao de pagamento aprovada!', 'success');
          } else if (updatedIntent.status === 'RECUSADO') {
             showToast('Intencao de pagamento recusada.', 'warning');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser, disabled, setActiveTab, setSelectedLoanId, showToast]);

  // 2. Monitoramento Periódico (Vencimentos e Saldo)
  const runScan = async () => {
    if (disabled || !activeUser) return;

    if (!permissionAsked.current) {
      permissionAsked.current = true;
      notificationService.requestPermission();
    }

    // A) Contratos vencendo HOJE (Alerta Matinal)
    if (loans?.length) {
      loans.forEach((loan) => {
        if (!loan || loan.isArchived) return;

        const installments = (loan as any).installments || [];
        installments.forEach((inst: any) => {
          if (!inst?.id || !inst?.dueDate) return;

          const status = getInstallmentStatusLogic(inst);
          if (status === LoanStatus.PAID) return;

          const diff = getDaysDiff(inst.dueDate);

          // Notifica apenas no dia exato e uma única vez por sessão
          if (diff === 0 && !notifiedDueLoans.current.has(inst.id)) {
            notifiedDueLoans.current.add(inst.id);

            notificationService.notify(
              'Cobranca do Dia',
              `O contrato de ${loan.debtorName} vence hoje. Fique atento!`,
              () => {
                setActiveTab('DASHBOARD');
                setSelectedLoanId(loan.id);
              }
            );
          }
        });
      });
    }

    // B) Saldo Crítico (Risco Operacional)
    (sources || []).forEach((source: any) => {
      if (!source?.id) return;
      const balance = Number(source.balance || 0);
      
      // Alerta apenas se cair abaixo de 50 reais (Extrema urgencia de caixa)
      if (balance < 50 && balance > -1000) {
         // Toast para nao poluir notificacoes nativas
      }
    });
  };

  useEffect(() => {
    if (!activeUser || disabled) return;

    const currentId = String(activeUser?.id || '');
    if (lastUserId.current !== currentId) {
      lastUserId.current = currentId;
      resetNotifiedCaches();
      permissionAsked.current = false;
    }

    const delay = setTimeout(runScan, 5000);
    checkTimer.current = setInterval(runScan, 600000);

    return () => {
      clearTimeout(delay);
      if (checkTimer.current) clearInterval(checkTimer.current);
    };
  }, [activeUser, disabled, loans.length]);

  return { manualCheck: runScan };
};
