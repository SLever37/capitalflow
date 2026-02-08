import React, { useState, useMemo, useEffect } from 'react';
import { ShieldCheck, RefreshCw, X, Building, MapPin, Gavel, MessageCircle, FileSignature, Lock, FileText, ChevronDown, LogOut, Calendar, DollarSign, Wallet, Eye, Download, Paperclip } from 'lucide-react';
import { useClientPortalLogic } from './hooks/useClientPortalLogic';
import { PortalLogin } from './components/PortalLogin';
import { formatMoney } from '../../utils/formatters';
import { PortalPaymentModal } from './components/PortalPaymentModal'; 
import { PortalChatDrawer } from './components/PortalChatDrawer';
import { supabase } from '../../lib/supabase';
import { getDaysUntilDue } from '../../components/cards/LoanCardComposition/helpers';
import { LoanStatus } from '../../types';

export const ClientPortalView = ({ initialLoanId }: { initialLoanId: string }) => {
    const {
        isLoading, isSigning, portalError,
        loggedClient, 
        activeToken: selectedLoanId, 
        setActiveToken: setSelectedLoanId,
        loan, installments, clientContracts,
        handleSignDocument, handleViewDocument,
        loadFullPortalData 
    } = useClientPortalLogic(initialLoanId);

    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const handleLogout = () => {
        window.location.href = '/';
    };

    const creditorInfo = useMemo(() => {
        if (!loan) return null;
        // Usa os dados mapeados do serviço (join com perfis)
        const l = loan as any;
        return {
            name: l.creditorName || 'Credor Responsável',
            doc: l.creditorDoc || '',
            address: l.creditorAddress || ''
        };
    }, [loan]);

    // Documentos visíveis (Uploads do Operador)
    const activeDocuments = useMemo(() => {
        const docs = (loan?.policiesSnapshot as any)?.customDocuments || (loan as any)?.customDocuments;
        if (!docs) return [];
        return (docs as any[]).filter(d => d.visibleToClient);
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
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Acesso Restrito.</p>
                    </div>
                    {portalError && (
                        <div className="mx-8 mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                            <p className="text-rose-400 text-xs font-bold">{portalError}</p>
                        </div>
                    )}
                    <div className="p-8 text-center">
                        <p className="text-slate-400 text-sm">O link utilizado é inválido ou expirou.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Cálculo de Totais
    const pendingInstallments = installments.filter(i => String(i.status) !== 'PAID');
    const totalJuridicoDevido = pendingInstallments.reduce((acc, i) => acc + i.amount, 0);
    const nextDueDate = pendingInstallments.length > 0 ? new Date(pendingInstallments[0].dueDate) : null;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 h-[85vh]">
                
                {/* HEADER COM SELETOR DE CONTRATO */}
                <div className="bg-slate-950 border-b border-slate-800 shrink-0 relative z-20">
                    <div className="p-5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
                                {loggedClient.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bem-vindo(a)</p>
                                <p className="text-white font-bold text-sm truncate max-w-[150px]">{loggedClient.name.split(' ')[0]}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2.5 bg-slate-900 text-slate-500 border border-slate-800 rounded-xl hover:text-rose-500 hover:border-rose-500/30 transition-colors">
                            <LogOut size={16}/>
                        </button>
                    </div>

                    {/* CONTRATO SWITCHER */}
                    <div className="px-5 pb-5">
                        <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 block ml-1">Contrato Selecionado</label>
                        <div className="relative group">
                            <select 
                                value={selectedLoanId}
                                onChange={(e) => setSelectedLoanId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-white text-xs font-bold uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                                disabled={clientContracts.length <= 1}
                            >
                                {clientContracts.map((c) => (
                                    <option key={c.portal_token || c.id} value={c.portal_token || c.id}>
                                        {c.code ? `CONTRATO #${c.code}` : `CONTRATO ...${(c.id || '').substring(0, 6).toUpperCase()}`} - {new Date(c.start_date || c.created_at).toLocaleDateString('pt-BR')}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-3 pointer-events-none text-slate-500 group-hover:text-white transition-colors">
                                {clientContracts.length > 1 ? <ChevronDown size={16} /> : <Lock size={14} className="opacity-50"/>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                    {/* CARD PRINCIPAL - VALOR */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] border border-slate-700 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                            <Wallet size={120} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                                <DollarSign size={12}/> Saldo Devedor Atual
                            </p>
                            <p className="text-3xl font-black text-white tracking-tight">{formatMoney(totalJuridicoDevido)}</p>
                            
                            {nextDueDate && (
                                <div className="mt-4 inline-flex items-center gap-2 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                                    <Calendar size={12} className="text-blue-400"/>
                                    <p className="text-[10px] text-slate-300 font-bold uppercase">
                                        Próx. Vencimento: <span className="text-white">{nextDueDate.toLocaleDateString('pt-BR')}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AÇÕES RÁPIDAS */}
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setShowPaymentModal(true)} 
                            disabled={totalJuridicoDevido <= 0}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 group"
                        >
                            <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><DollarSign size={20}/></div>
                            <span className="text-[10px] font-black uppercase">Pagar PIX</span>
                        </button>

                        <button 
                            onClick={() => setIsLegalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 active:scale-95 group"
                        >
                            <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><FileSignature size={20}/></div>
                            <span className="text-[10px] font-black uppercase">Contratos</span>
                        </button>
                    </div>

                    {/* LISTA DE DOCUMENTOS DO CONTRATO */}
                    {activeDocuments.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-black text-white uppercase flex items-center gap-2">
                                    <Paperclip size={14} className="text-blue-500"/> Documentos Anexados
                                </h3>
                            </div>
                            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                                {activeDocuments.map((doc: any) => (
                                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                                <FileText size={16}/>
                                            </div>
                                            <span className="text-xs text-white font-bold truncate max-w-[150px]">{doc.name}</span>
                                        </div>
                                        <Download size={14} className="text-slate-500"/>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LISTA DE PARCELAS */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-black text-white uppercase flex items-center gap-2">
                                <FileText size={14} className="text-blue-500"/> Extrato de Parcelas
                            </h3>
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded-lg">
                                {pendingInstallments.length} Pendentes
                            </span>
                        </div>
                        
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                            <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                {installments.length === 0 ? (
                                    <div className="p-8 text-center text-slate-600 text-[10px] font-bold uppercase">Nenhuma parcela encontrada.</div>
                                ) : (
                                    installments.map((p, idx) => {
                                        // LÓGICA DE STATUS UNIFICADA
                                        const daysDiff = getDaysUntilDue(p.dueDate);
                                        let statusLabel = '';
                                        let statusColor = 'text-slate-500';
                                        let dateColor = 'text-slate-300';

                                        if (p.status === LoanStatus.PAID) {
                                            statusLabel = 'Pago';
                                            statusColor = 'text-emerald-500';
                                            dateColor = 'text-slate-500';
                                        } else {
                                            if (daysDiff < 0) {
                                                const d = Math.abs(daysDiff);
                                                statusLabel = `Vencido há ${d} dia${d === 1 ? '' : 's'}`;
                                                statusColor = 'text-rose-500';
                                                dateColor = 'text-rose-400';
                                            } else if (daysDiff === 0) {
                                                statusLabel = 'Vence hoje';
                                                statusColor = 'text-amber-500 animate-pulse';
                                                dateColor = 'text-amber-400';
                                            } else if (daysDiff <= 3) {
                                                statusLabel = `Faltam ${daysDiff} dia${daysDiff === 1 ? '' : 's'}`;
                                                statusColor = 'text-amber-500';
                                                dateColor = 'text-amber-400';
                                            } else {
                                                statusLabel = 'Em dia';
                                                statusColor = 'text-slate-500';
                                                dateColor = 'text-slate-300';
                                            }
                                        }

                                        return (
                                            <div key={idx} className="flex justify-between items-center p-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${p.status === LoanStatus.PAID ? 'bg-emerald-500/10 text-emerald-500' : (daysDiff < 0 && p.status !== LoanStatus.PAID) ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800 text-slate-400'}`}>
                                                        {p.number}
                                                    </div>
                                                    <div>
                                                        <p className={`text-[10px] font-bold uppercase ${dateColor}`}>
                                                            {new Date(p.dueDate).toLocaleDateString()}
                                                        </p>
                                                        <p className={`text-[9px] font-bold uppercase ${statusColor}`}>
                                                            {statusLabel}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-black ${p.status === LoanStatus.PAID ? 'text-emerald-500 decoration-slate-500' : 'text-white'}`}>
                                                    {formatMoney(p.amount)}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* INFO CREDOR */}
                    {creditorInfo && (
                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/50 flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
                            <div className="p-2 bg-slate-800 rounded-xl text-slate-400"><Building size={16}/></div>
                            <div className="overflow-hidden flex-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Credor Responsável</p>
                                <p className="text-[10px] text-white font-bold truncate">{creditorInfo.name}</p>
                                {creditorInfo.doc && <p className="text-[8px] text-slate-600 truncate">{creditorInfo.doc}</p>}
                            </div>
                        </div>
                    )}
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
                                    {isSigning ? <RefreshCw className="animate-spin" size={18}/> : <><FileSignature size={18}/> Assinar Agora</>}
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
                    onClose={() => { setShowPaymentModal(false); loadFullPortalData(); }} 
                />
            )}
        </div>
    );
};