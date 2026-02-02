
import React, { useState, useMemo, useEffect } from 'react';
import { ShieldCheck, RefreshCw, X, Building, MapPin, Gavel, MessageCircle, FileSignature, Lock, FileText, ChevronDown } from 'lucide-react';
import { useClientPortalLogic } from './hooks/useClientPortalLogic';
import { PortalLogin } from './components/PortalLogin';
import { formatMoney } from '../../utils/formatters';
import { PortalPaymentModal } from './components/PortalPaymentModal'; 
import { PortalChatDrawer } from './components/PortalChatDrawer';
import { supabase } from '../../lib/supabase';

export const ClientPortalView = ({ initialLoanId }: { initialLoanId: string }) => {
    const {
        isLoading, isSigning, portalError,
        loginIdentifier, setLoginIdentifier,
        loggedClient, selectedLoanId, setSelectedLoanId,
        loan, installments, pixKey, clientContracts,
        handleLogin, handleLogout, handleSignDocument,
        loadFullPortalData 
    } = useClientPortalLogic(initialLoanId);

    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const creditorInfo = useMemo(() => {
        if (!loan) return null;
        return {
            name: loan.creditor_name || loan.creditorName || 'Credor Registrado',
            doc: loan.creditor_document || loan.creditorDoc || 'CPF não informado',
            address: loan.creditor_address || loan.creditorAddress || 'Endereço Comercial'
        };
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

    if (isLoading && !loan && !portalError) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!loggedClient) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    <div className="p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 text-blue-500 rounded-2xl mb-4">
                            <ShieldCheck size={40} />
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Portal do Cliente</h1>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Consulte sua dívida e pague via PIX</p>
                    </div>
                    {portalError && <p className="text-rose-500 text-xs font-bold text-center mb-4 bg-rose-500/10 py-2 mx-8 rounded-lg border border-rose-500/20">{portalError}</p>}
                    <PortalLogin loginIdentifier={loginIdentifier} setLoginIdentifier={setLoginIdentifier} handleLogin={handleLogin} isLoading={isLoading} selectedLoanId={selectedLoanId} />
                </div>
            </div>
        );
    }

    const totalJuridicoDevido = installments.reduce((acc, i) => acc + (i.status !== 'PAID' ? i.valor_parcela : 0), 0);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600"></div>
                
                <div className="p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Olá,</p>
                        <p className="text-white font-black text-lg truncate max-w-[200px]">{loggedClient.name.split(' ')[0]}</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-slate-900 text-slate-500 rounded-lg hover:text-rose-500 transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                {/* SWITCHER DE CONTRATOS */}
                {clientContracts.length > 1 && (
                    <div className="px-6 pt-4">
                        <div className="relative">
                            <select 
                                value={selectedLoanId}
                                onChange={(e) => setSelectedLoanId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer"
                            >
                                {clientContracts.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        Contrato {c.id.substring(0, 6).toUpperCase()} • {new Date(c.created_at || c.start_date).toLocaleDateString()}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-3.5 text-slate-500 pointer-events-none"/>
                        </div>
                    </div>
                )}

                <div className="px-6 py-6 space-y-6 overflow-y-auto custom-scrollbar max-h-[75vh]">
                    {creditorInfo && (
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Building size={12}/> Credor Responsável
                            </p>
                            <div className="space-y-1">
                                <p className="text-xs text-white font-bold">{creditorInfo.name}</p>
                                <p className="text-[10px] text-slate-500">{creditorInfo.doc}</p>
                                <p className="text-[10px] text-slate-600 flex items-center gap-1"><MapPin size={8}/> {creditorInfo.address}</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-950 p-5 rounded-2xl border border-blue-900/30 text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Dívida Total Consolidada</p>
                        <p className="text-3xl font-black text-white">{formatMoney(totalJuridicoDevido)}</p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mt-2">Ref. Contrato: {selectedLoanId.slice(0,8).toUpperCase()}</p>
                    </div>

                    <div className="bg-indigo-950/20 border border-indigo-500/30 p-5 rounded-2xl text-center">
                        <FileSignature className="text-indigo-400 mx-auto mb-3" size={32}/>
                        <h3 className="text-xs font-black text-white uppercase mb-2">Contratos e Títulos</h3>
                        <p className="text-[10px] text-slate-400 leading-relaxed mb-4">Assine digitalmente seus títulos de dívida para plena regularização e fôlego comercial.</p>
                        <button onClick={() => setIsLegalOpen(true)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-indigo-500 transition-all shadow-lg">Acessar Documentos</button>
                    </div>

                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-3 flex items-center gap-2"><FileText size={12}/> Plano de Pagamento</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {installments.map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs py-2 border-b border-slate-800/50 last:border-0">
                                    <span className="text-slate-300">{p.numero_parcela}ª - {new Date(p.data_vencimento).toLocaleDateString()}</span>
                                    <span className={p.status === 'PAID' ? 'text-emerald-500 font-bold' : 'text-white font-bold'}>{formatMoney(p.valor_parcela)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowPaymentModal(true)} 
                        disabled={totalJuridicoDevido <= 0}
                        className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                    >
                        Pagar via PIX (Automático)
                    </button>
                </div>
            </div>

            {/* FAB CHAT CLIENTE */}
            {loan && (
                <button 
                    onClick={() => setIsChatOpen(true)}
                    className="fixed bottom-8 right-8 p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:scale-110 transition-all active:scale-95 z-[100] group"
                >
                    <MessageCircle size={28}/>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full ring-4 ring-slate-950 animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                    <span className="absolute right-full mr-4 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-2xl">Dúvidas?</span>
                </button>
            )}

            <PortalChatDrawer loan={loan} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

            {isLegalOpen && (
                <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-md flex items-center justify-center p-4 z-[150]">
                    <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-indigo-500/30 max-w-lg w-full shadow-2xl">
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
                            <button onClick={() => handleSignDocument('CONFISSAO')} disabled={isSigning} className="w-full p-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-lg transition-all">
                                {isSigning ? <RefreshCw className="animate-spin" size={18}/> : <><FileSignature size={18}/> Assinar Eletronicamente</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPaymentModal && installments.length > 0 && (
                <PortalPaymentModal 
                    loan={loan} 
                    installment={installments.find(i => i.status !== 'PAID') as any} 
                    clientData={{ name: loggedClient.name, doc: loggedClient.document }} 
                    onClose={() => { setShowPaymentModal(false); loadFullPortalData(selectedLoanId, loggedClient.id); }} 
                />
            )}
        </div>
    );
};
