import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { supportChatService } from '../services/supportChat.service';
import { SupportMessage, SupportTicket, MessageType } from '../types/supportChat.types';
import { playNotificationSound } from '../../utils/notificationSound';

type SenderType = 'CLIENT' | 'OPERATOR';

/**
 * Hook de sessão de chat com enforcement real de ticket OPEN/CLOSED.
 * - `senderType` define quem está usando a UI (CLIENT ou OPERATOR)
 * - O service valida ticket e bloqueia CLIENT quando CLOSED
 */
export const useChatSession = (
  loanId: string,
  currentUserId: string,
  senderType: SenderType
) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const refreshData = async () => {
    const [msgs, tkt] = await Promise.all([
      supportChatService.getMessages(loanId),
      supportChatService.getTicketStatus(loanId)
    ]);
    setMessages(msgs || []);
    setTicket(tkt);
    setIsLoading(false);
    setTimeout(scrollToBottom, 100);
  };

  useEffect(() => {
    refreshData();

    const channel = supabase
      .channel(`room-${loanId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_suporte', filter: `loan_id=eq.${loanId}` },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          setMessages((prev) => [...prev, newMsg]);

          if (newMsg.profile_id !== currentUserId) {
            playNotificationSound();
            supportChatService.markAsRead(loanId, currentUserId);
          }
          setTimeout(scrollToBottom, 100);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `loan_id=eq.${loanId}` },
        (payload) => {
          setTicket(payload.new as SupportTicket);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loanId]);

  const handleSendMessage = async (
    text: string,
    type: MessageType = 'text',
    fileUrl?: string,
    metadata?: any
  ) => {
    setError(null);
    try {
      await supportChatService.sendMessage({
        loan_id: loanId,
        profile_id: currentUserId,
        sender_type: senderType, // ✅ CRÍTICO: CLIENT não pode enviar como OPERATOR
        content: text,
        type,
        file_url: fileUrl,
        metadata
      });
    } catch (e: any) {
      // 🚫 nada de alert() (proibido)
      setError(e?.message || 'Falha ao enviar mensagem.');
      throw e;
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket?.id) return;
    await supportChatService.closeTicket(ticket.id, currentUserId);
    await handleSendMessage('Atendimento encerrado pelo operador.', 'system');
  };

  const handleReopenTicket = async () => {
    await supportChatService.createOrOpenTicket(loanId);
    await handleSendMessage('Atendimento reaberto.', 'system');
  };

  /**
   * Para o CLIENT: cria um novo ticket OPEN se o último está CLOSED.
   * (Equivale a "Novo chamado")
   */
  const handleOpenNewTicket = async () => {
    setError(null);
    try {
      await supportChatService.createOrOpenTicket(loanId);
    } catch (e: any) {
      setError(e?.message || 'Falha ao abrir novo chamado.');
      throw e;
    }
  };

  return {
    messages,
    ticket,
    isLoading,
    error,
    scrollRef,
    handleSendMessage,
    handleCloseTicket,
    handleReopenTicket,
    handleOpenNewTicket
  };
};