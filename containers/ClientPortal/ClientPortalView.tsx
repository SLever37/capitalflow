import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  MessageCircle,
  AlertTriangle,
  BellRing,
  FileSignature,
  X,
  Lock,
  Gavel
} from 'lucide-react';

import { useClientPortalLogic } from '../../features/portal/hooks/useClientPortalLogic';
import { usePortalClientNotifications } from '../../features/portal/hooks/usePortalClientNotifications';
import { PortalPaymentModal } from '../../features/portal/components/PortalPaymentModal';
import { PortalChatDrawer } from '../../features/portal/components/PortalChatDrawer';
import { supabase } from '../../lib/supabase';
import { resolveDebtSummary, resolveInstallmentDebt } from '../../features/portal/mappers/portalDebtRules';

// Subcomponentes
import { PortalHeader } from './components/PortalHeader';
import { PortalSummaryCard } from './components/PortalSummaryCard';
import { PortalActions } from './components/PortalActions';
import { PortalDocuments } from './components/PortalDocuments';
import { PortalCreditorInfo } from './components/PortalCreditorInfo';
import { PortalInstallmentItem } from './components/PortalInstallmentItem'; // Import direto para controle da lista

interface ClientPortalViewProps {
  initialPortalToken: string;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  initialPortalToken,
}) => {
  const {
    isLoading,
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
    isSigning
  } = useClientPortalLogic(initialPortalToken);

  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- MAPPERS & CALCULATIONS ---

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
    const docs = (loan as any)?.policiesSnapshot?.customDocuments || (loan as any)?.customDocuments;
    if (!docs) return [];
    return (docs as any[]).filter((d: any) => d.visibleToClient);
  }, [loan]);

  // Cálculo Centralizado de Dívida (Fonte da Verdade)
  const debtSummary = useMemo(() => 
    resolveDebtSummary(loan as any, installments), 
  [loan, installments]);

  const { totalDue, nextDueDate, pendingCount, hasLateInstallments, maxDaysLate } = debtSummary;

  // --- TEMA DE ALERTA ---
  const alertTheme = hasLateInstallments;
  
  const themeClasses = {
      bg: alertTheme ? "bg-rose-950/20" : "bg-slate-900",
      border: alertTheme ? "border-rose-500/30" : "border-slate-800",
      shadow: alertTheme ? "shadow-[0_0_40px_rgba(244,63,94,0.15)]" : "shadow-2xl",
      cardGradient: alertTheme ? "from-rose-900 to-slate-900 border-rose-500/30" : "from-slate-800 to-slate-900 border-slate-700",
      accentText: alertTheme ? "text-rose-400" : "text-blue-400",
      payButton: alertTheme ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/20" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
  };

  // --- NOTIFICAÇÕES LOCAIS ---
  const clientNotification = usePortalClientNotifications(activeToken, { 
    overdueCount: hasLateInstallments ? pendingCount : 0, 
    maxDaysLate, 
    nextDueDate 
  });

  // --- REALTIME CHAT ---
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
        { event: 'INSERT', schema: 'public', table: 'mensagens_suporte', filter: `loan_id=eq.${loan.id}` },
        fetchUnread
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loan?.id, isChatOpen]);


  // --- RENDER ---

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-4">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest animate-pulse">Carregando Portal...</p>
      </div>
    );
  }

  if (portalError || !loan || !loggedClient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center">
            <ShieldCheck size={48} className="mx-auto text-rose-500 mb-4" />
            <h2 className="text-white font-black text-xl mb-2">Acesso Indisponível</h2>
            <p className="text-slate-400 text-sm mb-4">{portalError || "Link inválido ou expirado."}</p>
        </div>
      </div>
    );
  }

  // Ordena parcelas: Vencidas primeiro, depois futuras
  const sortedInstallments = [...installments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const pendingInstallmentsList = sortedInstallments.filter(i => (i.status as string) !== 'PAID');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-700">
      
      {/* NOTIFICAÇÃO DO CLIENTE (TOAST) */}
      {clientNotification && clientNotification.show && (
          <div className="fixed top-6 left-4 right-4 z-[200] animate-in slide-in-from-top-6 duration-500 pointer-events-none">
             <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border-l-4 border-rose-500 flex items-start gap-3 max-w-sm mx-auto pointer-events-auto ring-1 ring-white/10">
                <div className="p-2 bg-rose-500/10 rounded-full text-rose-500 shrink-0">
                    <BellRing size={18} className="animate-pulse"/>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white mb-1">Aviso Importante</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{clientNotification.message}</p>
                </div>
             </div>
          </div>
      )}

      <div className={`${themeClasses.bg} border ${themeClasses.border} ${themeClasses.shadow} rounded-[2.5rem] w-full max-w-md flex flex-col h-[85vh] animate-in zoom-in-95 duration-300 transition-all relative overflow-hidden`}>
        
        {/* Efeito de Fundo Alerta */}
        {alertTheme && <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 blur-[80px] rounded-full pointer-events-none"></div>}

        <PortalHeader
          loggedClient={loggedClient}
          selectedLoanId={activeToken} 
          setSelectedLoanId={(newToken) => setActiveToken(newToken)} 
          clientContracts={clientContracts.map(c => ({
              id: c.portal_token, 
              code: c.code || c.id.substring(0,6),
              start_date: c.start_date || c.created_at
          }))}
          handleLogout={() => window.location.href = '/'} 
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 relative z-10">
          
          {/* Card de Saldo */}
          <div className={`p-6 rounded-[2rem] border shadow-xl relative overflow-hidden bg-gradient-to-br transition-all duration-500 ${themeClasses.cardGradient}`}>
              <div className="relative z-10">
                  <p className={`text-[10px] font-black uppercase mb-1 flex items-center gap-1 ${alertTheme ? 'text-rose-200' : 'text-slate-400'}`}>
                      {alertTheme ? <AlertTriangle size={12}/> : <ShieldCheck size={12}/>} Saldo Devedor Atual
                  </p>
                  <p className="text-3xl font-black text-white tracking-tight">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDue)}</p>
                  
                  {nextDueDate && (
                      <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm border ${alertTheme ? 'bg-rose-950/40 border-rose-500/30' : 'bg-slate-950/50 border-slate-700/50'}`}>
                          <p className="text-[10px] text-white font-bold uppercase">
                              Próx. Vencimento: {nextDueDate.toLocaleDateString('pt-BR')}
                          </p>
                      </div>
                  )}
              </div>
          </div>

          {/* Botões de Ação (Cor adaptativa) */}
          <div className="grid grid-cols-2 gap-3">
             <button onClick={() => setShowPaymentModal(true)} disabled={totalDue <= 0} className={`text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.payButton}`}>
                 <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><ShieldCheck size={20}/></div>
                 <span className="text-[10px] font-black uppercase">Regularizar</span>
             </button>
             <button onClick={() => setIsLegalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 active:scale-95 group">
                 <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><FileSignature size={20}/></div>
                 <span className="text-[10px] font-black uppercase">Contratos</span>
             </button>
          </div>

          <PortalDocuments documents={activeDocuments} />

          {/* Lista de Parcelas (Manual para usar o resolveInstallmentDebt) */}
          <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-white uppercase">Extrato de Parcelas</h3>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${alertTheme ? 'bg-rose-950/50 text-rose-400' : 'bg-slate-900 text-slate-500'}`}>
                      {pendingCount} Pendentes
                  </span>
              </div>
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                      {pendingInstallmentsList.length === 0 && installments.length > 0 ? (
                          <div className="p-8 text-center text-emerald-500 text-[10px] font-bold uppercase">Todas as parcelas quitadas!</div>
                      ) : installments.length === 0 ? (
                          <div className="p-8 text-center text-slate-600 text-[10px] font-bold uppercase">Nenhuma parcela encontrada.</div>
                      ) : (
                          // Renderiza TODAS (pagas e pendentes) ou apenas pendentes? Geralmente todas.
                          sortedInstallments.map((inst, idx) => (
                              <PortalInstallmentItem key={idx} loan={loan as any} installment={inst} />
                          ))
                      )}
                  </div>
              </div>
          </div>

          <PortalCreditorInfo creditor={creditorInfo} />
        </div>
      </div>

      {/* FAB CHAT */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 z-[100]"
      >
        <MessageCircle size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-950 animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      <PortalChatDrawer loan={loan} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* MODAL JURÍDICO */}
      {isLegalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[150] p-4 backdrop-blur-sm">
          <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-indigo-500/30 max-w-lg w-full shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={() => setIsLegalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={18}/></button>
            <div className="flex flex-col items-center text-center py-6">
                <Lock size={40} className="text-indigo-500 mb-4"/>
                <h2 className="text-white font-black uppercase text-lg mb-2">Central Jurídica</h2>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 w-full mb-6">
                    <Gavel className="mx-auto text-indigo-400 mb-2" size={24}/>
                    <h4 className="text-white font-bold text-sm uppercase">Instrumento de Confissão</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Documento disponível para assinatura eletrônica.</p>
                </div>
                <button onClick={() => handleSignDocument('CONFISSAO')} disabled={isSigning} className="w-full p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs flex justify-center gap-2 items-center">
                    {isSigning ? <RefreshCw className="animate-spin" size={16}/> : <><FileSignature size={16}/> Assinar Digitalmente</>}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGAMENTO */}
      {showPaymentModal && pendingInstallmentsList.length > 0 && (
          <PortalPaymentModal 
              loan={loan as any} 
              installment={pendingInstallmentsList[0]} 
              clientData={{ name: loggedClient.name, doc: loggedClient.document, id: loggedClient.id }} 
              onClose={() => { setShowPaymentModal(false); loadFullPortalData(); }} 
          />
      )}
    </div>
  );
};
