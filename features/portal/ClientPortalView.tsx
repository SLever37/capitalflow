
import React, { useState, useMemo } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, Handshake, Upload, FileText, ExternalLink, Printer, FileSignature, CheckCircle2, Lock, Eye, X, Clock, Calendar, Building, MapPin } from 'lucide-react';
import { useClientPortalLogic } from './hooks/useClientPortalLogic';
import { PortalLogin } from './components/PortalLogin';
import { formatMoney } from '../../utils/formatters';
import { PortalPaymentModal } from './components/PortalPaymentModal'; 

export const ClientPortalView = ({ initialLoanId }: { initialLoanId: string }) => {
    const {
        isLoading, portalError,
        loginIdentifier, setLoginIdentifier,
        loggedClient, selectedLoanId,
        loan, installments, pixKey,
        handleLogin, handleLogout,
        loadFullPortalData 
    } = useClientPortalLogic(initialLoanId);

    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Dados do Credor vindos do Snapshot do Contrato
    const creditorInfo = useMemo(() => {
        if (!loan) return null;
        return {
            name: loan.creditor_name || loan.creditorName || 'Credor Registrado',
            doc: loan.creditor_document || loan.creditorDoc || 'CPF não informado',
            address: loan.creditor_address || loan.creditorAddress || 'Endereço Comercial'
        };
    }, [loan]);

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
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95">
                    <div className="p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 text-blue-500 rounded-2xl mb-4">
                            <ShieldCheck size={40} />
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Portal do Cliente</h1>
                    </div>
                    {portalError && <p className="text-rose-500 text-xs font-bold text-center mb-4">{portalError}</p>}
                    <PortalLogin loginIdentifier={loginIdentifier} setLoginIdentifier={setLoginIdentifier} handleLogin={handleLogin} isLoading={isLoading} selectedLoanId={selectedLoanId} />
                </div>
            </div>
        );
    }

    const pendingInstallmentRaw = installments.find(i => i.status !== 'PAID');
    const pendingInstallmentNormalized = pendingInstallmentRaw ? {
        id: pendingInstallmentRaw.id || 'temp', 
        dueDate: pendingInstallmentRaw.data_vencimento,
        amount: pendingInstallmentRaw.valor_parcela,
        principalRemaining: pendingInstallmentRaw.principal_remaining ?? pendingInstallmentRaw.valor_parcela,
        interestRemaining: pendingInstallmentRaw.interest_remaining ?? 0,
        lateFeeAccrued: pendingInstallmentRaw.late_fee_accrued ?? 0,
        paidTotal: 0,
        status: pendingInstallmentRaw.status as any,
    } : null;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600"></div>
                
                <div className="p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase">Olá,</p>
                        <p className="text-white font-black text-lg">{loggedClient.name.split(' ')[0]}</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-slate-900 text-slate-500 rounded-lg hover:text-rose-500"><X size={20}/></button>
                </div>

                <div className="px-6 py-6 space-y-6 overflow-y-auto custom-scrollbar max-h-[75vh]">
                    
                    {/* INFORMAÇÃO DO CREDOR (REQUISITO LEGAL) */}
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

                    <div className="bg-indigo-950/20 border border-indigo-500/30 p-5 rounded-2xl text-center">
                        <FileSignature className="text-indigo-400 mx-auto mb-3" size={32}/>
                        <h3 className="text-xs font-black text-white uppercase mb-2">Contratos e Títulos</h3>
                        <p className="text-[10px] text-slate-400 leading-relaxed mb-4">Visualize e assine digitalmente seus títulos de dívida.</p>
                        <button onClick={() => setIsLegalOpen(true)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px]">Acessar Documentos</button>
                    </div>

                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-3 flex items-center gap-2"><FileText size={12}/> Suas Parcelas</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
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
                        disabled={!pendingInstallmentNormalized}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-lg"
                    >
                        Pagar via PIX (Automático)
                    </button>
                </div>

                {isLegalOpen && (
                    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
                        <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-indigo-500/30 max-w-lg w-full shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-white font-black uppercase text-sm flex items-center gap-2"><Lock size={16} className="text-indigo-500"/> Documentação Digital</h2>
                                <button onClick={() => setIsLegalOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400"><X size={18}/></button>
                            </div>
                            <div className="space-y-3">
                                <button onClick={() => window.open(`${window.location.origin}/?legal_sign=${loan?.id}`, '_blank')} className="w-full p-5 bg-slate-950 border border-slate-800 rounded-2xl text-left hover:border-indigo-500 transition-all group">
                                    <p className="text-xs font-bold text-white group-hover:text-indigo-400 uppercase">Assinar Confissão de Dívida</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Instrumento particular (Art. 784 CPC)</p>
                                </button>
                                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl opacity-50">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Nota Promissória</p>
                                    <p className="text-[10px] text-slate-600 mt-1">Disponível para impressão física no balcão.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showPaymentModal && pendingInstallmentNormalized && (
                    <PortalPaymentModal loan={loan} installment={pendingInstallmentNormalized as any} clientData={{ name: loggedClient.name }} onClose={() => { setShowPaymentModal(false); loadFullPortalData(selectedLoanId, loggedClient.id); }} />
                )}
            </div>
        </div>
    );
};
