
import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  X,
  Gavel,
  MessageCircle,
  FileSignature,
  Lock,
  Eye,
  RefreshCw as Spinner,
} from 'lucide-react';

import { useClientPortalLogic } from '../../features/portal/hooks/useClientPortalLogic';
import { PortalPaymentModal } from '../../features/portal/components/PortalPaymentModal';
import { PortalChatDrawer } from '../../features/portal/components/PortalChatDrawer';
import { supabase } from '../../lib/supabase';
import { resolveDebtSummary } from '../../features/portal/mappers/portalDebtRules';

// Subcomponentes
import { PortalHeader } from './components/PortalHeader';
import { PortalSummaryCard } from './components/PortalSummaryCard';
import { PortalActions } from './components/PortalActions';
import { PortalDocuments } from './components/PortalDocuments';
import { PortalInstallmentsList } from './components/PortalInstallmentsList';
import { PortalCreditorInfo } from './components/PortalCreditorInfo';

interface ClientPortalViewProps {
  initialPortalToken: string;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  initialPortalToken,
}) => {
  const {
    isLoading,
    isSigning,
    portalError,
    
    // Dados
    loan,
    installments,
    loggedClient,
    clientContracts,
    
    // Controle
    activeToken,
    setActiveToken,
    
    // Ações
    handleSignDocument,
    handleViewDocument,
    loadFullPortalData,
  } = useClientPortalLogic(initialPortalToken);

  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mappers de UI
  const creditorInfo = useMemo(() => {
    if (!loan) return null;
    const l = loan as any;
    return {
      name: l.creditorName || 'Credor Responsável',
      doc: l.creditorDoc || '',
      address: l.creditorAddress || l.debtorAddress || '', 
    };
  }, [loan]);

  const activeDocuments = useMemo(() => {
    // Tenta acessar do snapshot ou diretamente do objeto loan se tipado
    const docs = (loan as any)?.policiesSnapshot?.customDocuments || (loan as any)?.customDocuments;
    if (!docs) return [];
    return (docs as any[]).filter((d) => d.visibleToClient);
  }, [loan]);

  // Realtime Chat Badge
  useEffect(() => {
    if (!loan || isChatOpen) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('mensagens_suporte')
        .select('*', { count: 'exact', head: true })
        .eq('loan_id', loan.id)
        .eq('sender_type', 'OPERATOR')
        .eq('read', false);

      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel(`portal-unread-${loan.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_suporte',
          filter: `loan_id=eq.${loan.id}`,
        },
        fetchUnread
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loan?.id, isChatOpen]);

  // --- RENDERS ---

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-4">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest animate-pulse">
          Carregando Portal...
        </p>
      </div>
    );
  }

  // 2. Error State
  if (portalError || !loan || !loggedClient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center">
            <ShieldCheck size={48} className="mx-auto text-rose-500 mb-4" />
            <h2 className="text-white font-black text-xl mb-2">Acesso Indisponível</h2>
            <p className="text-slate-400 text-sm mb-4">
                {portalError || "O link utilizado é inválido ou expirou."}
            </p>
            <p className="text-xs text-slate-600">
                Solicite um novo link de acesso ao seu gestor.
            </p>
        </div>
      </div>
    );
  }

  // 3. Main Portal UI
  const { totalDue, nextDueDate, pendingCount } = resolveDebtSummary(loan, installments);
  const pendingInstallments = installments.filter((i) => i.status !== 'PAID');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col h-[85vh] animate-in zoom-in-95 duration-300">

        <PortalHeader
          loggedClient={loggedClient}
          selectedLoanId={activeToken} // O "ID selecionado" é o Token neste contexto
          setSelectedLoanId={(newToken) => setActiveToken(newToken)} 
          clientContracts={clientContracts.map(c => ({
              id: c.portal_token, // A chave de navegação é o token
              code: c.code || c.id.substring(0,6),
              start_date: c.start_date || c.created_at
          }))}
          handleLogout={() => window.location.href = '/'} 
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          <PortalSummaryCard
            totalJuridicoDevido={totalDue}
            nextDueDate={nextDueDate}
          />

          <PortalActions
            onPayment={() => setShowPaymentModal(true)}
            onLegal={() => setIsLegalOpen(true)}
            disablePayment={totalDue <= 0}
          />

          <PortalDocuments documents={activeDocuments} />

          <PortalInstallmentsList
            loan={loan}
            installments={installments}
            pendingCount={pendingCount}
          />

          <PortalCreditorInfo creditor={creditorInfo} />
        </div>
      </div>

      {/* FAB CHAT */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-2xl z-[100] hover:scale-110 transition-all active:scale-95"
      >
        <MessageCircle size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-950 animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      <PortalChatDrawer
        loan={loan}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* MODAL JURÍDICO */}
      {isLegalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[150] p-4">
          <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-indigo-500/30 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-black uppercase text-sm flex items-center gap-2">
                <Lock size={16} className="text-indigo-500" /> Central Jurídica
              </h2>
              <button onClick={() => setIsLegalOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleViewDocument}
                className="p-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all"
              >
                <Eye size={20} /> Visualizar Minuta
              </button>

              <button
                onClick={() => handleSignDocument('CONFISSAO')}
                disabled={isSigning}
                className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex flex-col items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all shadow-lg"
              >
                {isSigning ? (
                  <Spinner className="animate-spin" size={20} />
                ) : (
                  <FileSignature size={20} />
                )}
                Assinar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGAMENTO */}
      {showPaymentModal && pendingInstallments.length > 0 && (
        <PortalPaymentModal
          loan={loan}
          installment={pendingInstallments[0]}
          clientData={{
            name: loggedClient.name,
            doc: loggedClient.document,
            id: loggedClient.id,
          }}
          onClose={() => {
            setShowPaymentModal(false);
            loadFullPortalData(); // Refresh após pagar
          }}
        />
      )}
    </div>
  );
};
