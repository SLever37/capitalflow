
import React, { useState, useMemo, useEffect } from 'react';
import { ShieldCheck, RefreshCw, X, Gavel, MessageCircle, FileSignature, Lock, Eye, RefreshCw as Spinner } from 'lucide-react';
import { useClientPortalLogic } from '../../features/portal/hooks/useClientPortalLogic';
import { PortalLogin } from '../../features/portal/components/PortalLogin';
import { PortalPaymentModal } from '../../features/portal/components/PortalPaymentModal'; 
import { PortalChatDrawer } from '../../features/portal/components/PortalChatDrawer';
import { supabase } from '../../lib/supabase';

// Novos Componentes
import { PortalHeader } from './components/PortalHeader';
import { PortalSummaryCard } from './components/PortalSummaryCard';
import { PortalActions } from './components/PortalActions';
import { PortalDocuments } from './components/PortalDocuments';
import { PortalInstallmentsList } from './components/PortalInstallmentsList';
import { PortalCreditorInfo } from './components/PortalCreditorInfo';

export const ClientPortalView = ({ initialLoanId }: { initialLoanId: string }) => {
    const {
        isLoading, isSigning, portalError,
        loginIdentifier, setLoginIdentifier,
        loggedClient, selectedLoanId, setSelectedLoanId,
        loan, installments, pixKey, clientContracts,
        handleLogin, handleLogout, handleSignDocument, handleViewDocument,
        loadFullPortalData 
    } = useClientPortalLogic(initialLoanId);

    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const creditorInfo = useMemo(() => {
        if (!loan) return null;
        return {
            name: loan.creditorName || 'Credor Responsável',
            doc: loan.creditorDoc || '',
            address: loan.creditorAddress || ''
        };
    }, [loan]);

    const activeDocuments = useMemo(() => {
        if (!loan?.policies_snapshot?.customDocuments) return [];
        return (loan.policies_snapshot.customDocuments as any[]).filter(d => d.visibleToClient);
    }, [loan]);

    useEffect(() => {
        if (loan && !isChatOpen) {
            const fetchUnread = async () => {
                const { count } = await supabase
                    .from('mensagens_suporte')
                    .select('*', { count: 'exact', head: true })
                    .eq('loan_id', loan.id)
                    .eq('sender', 'OPERATOR')
                    .eq('read', false);
                setUnreadCount(count || 0);
            };
            fetchUnread();
            const channel = supabase.channel('portal-unread-badge')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_suporte', filter: `loan_id=eq.${loan.id}` }, 
                () => fetchUnread())
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        } else {
            setUnreadCount(0);
        }
    }, [loan?.id, isChatOpen]);

    // --- RENDERIZADORES ---

    if (isLoading && !loan && !portalError) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-4">
                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-slate-500 text-xs font-black uppercase tracking-widest animate-pulse">Carregando Portal...</p>
            </div>
        );
    }

    if (!loggedClient) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    <div className="absolute inset-0 bg-blue-600/5 blur-3xl pointer-events-none rounded-full"></div>
                    <div className="p-8 text-center relative z-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800 rounded-3xl mb-6 shadow-xl border border-slate-700">
                            <ShieldCheck size={40} className="text-blue-500" />
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Portal do Cliente</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Acesse seus contratos e realize pagamentos com segurança.</p>
                    </div>
                    {portalError && (
                        <div className="mx-8 mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                            <p className="text-rose-400 text-xs font-bold">{portalError}</p>
                        </div>
                    )}
                    <PortalLogin loginIdentifier={loginIdentifier} setLoginIdentifier={setLoginIdentifier} handleLogin={handleLogin} isLoading={isLoading} selectedLoanId={selectedLoanId} />
                </div>
            </div>
        );
    }

    // Cálculo de Totais
    const pendingInstallments = installments.filter(i => i.status !== 'PAID');
    const totalJuridicoDevido = pendingInstallments.reduce((acc, i) => acc + i.valor_parcela, 0);
    const nextDueDate = pendingInstallments.length > 0 ? new Date(pendingInstallments[0].data_vencimento) : null;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 h-[85vh]">
                
                <PortalHeader 
                    loggedClient={loggedClient} 
                    selectedLoanId={selectedLoanId} 
                    setSelectedLoanId={setSelectedLoanId} 
                    clientContracts={clientContracts} 
                    handleLogout={handleLogout} 
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                    
                    <PortalSummaryCard 
                        totalJuridicoDevido={totalJuridicoDevido} 
                        nextDueDate={nextDueDate} 
                    />

                    <PortalActions 
                        onPayment={() => setShowPaymentModal(true)} 
                        onLegal={() => setIsLegalOpen(true)}
                        disablePayment={totalJuridicoDevido <= 0}
                    />

                    <PortalDocuments documents={activeDocuments} />

                    <PortalInstallmentsList 
                        installments={installments} 
                        pendingCount={pendingInstallments.length} 
                    />

                    <PortalCreditorInfo creditor={creditorInfo} />
                </div>
            </div>

            {/* FAB CHAT */}
            {loan && (
                <button 
                    onClick={() => setIsChatOpen(true)}
                    className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:scale-110 transition-all active:scale-95 z-[100] group"
                >
                    <MessageCircle size={24}/>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-slate-950 animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            <PortalChatDrawer loan={loan} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

            {/* MODAL JURÍDICO */}
            {isLegalOpen && (
                <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-md flex items-center justify-center p-4 z-[150]">
                    <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-indigo-500/30 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-white font-black uppercase text-sm flex items-center gap-2"><Lock size={16} className="text-indigo-500"/> Central Jurídica</h2>
                            <button onClick={() => setIsLegalOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={18}/></button>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 text-center">
                                <Gavel className="mx-auto text-indigo-400 mb-3" size={32}/>
                                <h4 className="text-white font-bold text-sm uppercase mb-1">Título Executivo Pendente</h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed">Você possui um instrumento de Confissão de Dívida aguardando assinatura eletrônica para validade total do acordo.</p>
                            </div>
                            
                            {/* Botões de Ação */}
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={handleViewDocument} className="p-4 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-2xl font-black uppercase text-[10px] flex flex-col items-center justify-center gap-2 transition-all">
                                    <Eye size={18}/> Visualizar Minuta
                                </button>
                                <button onClick={() => handleSignDocument('CONFISSAO')} disabled={isSigning} className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] flex flex-col items-center justify-center gap-2 shadow-lg transition-all">
                                    {isSigning ? <Spinner className="animate-spin" size={18}/> : <><FileSignature size={18}/> Assinar Agora</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PAGAMENTO */}
            {showPaymentModal && installments.length > 0 && (
                <PortalPaymentModal 
                    loan={loan} 
                    installment={pendingInstallments[0] || installments[installments.length-1]} 
                    clientData={{ name: loggedClient.name, doc: loggedClient.document }} 
                    onClose={() => { setShowPaymentModal(false); loadFullPortalData(selectedLoanId, loggedClient.id); }} 
                />
            )}
        </div>
    );
};
