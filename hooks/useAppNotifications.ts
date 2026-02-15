
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
          table: 'sinalizacoes_pagamento', 
          filter: `profile_id=eq.${activeUser.id}` 
        },
        (payload) => {
          const newSignal = payload.new;
          // Alerta Imediato de Pagamento (Dinheiro na mão é prioridade máxima)
          if (newSignal.status === 'PENDENTE') {
             notificationService.notify(
                '💰 Pagamento Recebido!',
                'Um cliente enviou um novo comprovante. Clique para validar.',
                () => {
                   setActiveTab('DASHBOARD');
                   setSelectedLoanId(newSignal.loan_id);
                }
             );
             showToast('Novo comprovante recebido! Verifique agora.', 'success');
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
              '📅 Cobrança do Dia',
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
      
      // Alerta apenas se cair abaixo de 50 reais (Extrema urgência de caixa)
      if (balance < 50 && balance > -1000) { // > -1000 para não spammar se já estiver muito negativo
         // Aqui usamos apenas Toast para não poluir as notificações nativas, 
         // reservando o nativo para interação humana (Chat/Pagamento)
         // playNotificationSound já é chamado pelo Toast de erro
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

    const delay = setTimeout(runScan, 5000); // 5s após carga
    checkTimer.current = setInterval(runScan, 600000); // A cada 10 min

    return () => {
      clearTimeout(delay);
      if (checkTimer.current) clearInterval(checkTimer.current);
    };
  }, [activeUser, disabled, loans.length]);

  return { manualCheck: runScan };
};
