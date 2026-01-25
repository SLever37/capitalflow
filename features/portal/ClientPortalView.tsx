
import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, Handshake, Upload, FileText, ExternalLink, Printer } from 'lucide-react';
import { openSystemPromissoriaPrint } from '../../utils/printHelpers';
import { useClientPortalLogic } from './hooks/useClientPortalLogic';
import { PortalLogin } from './components/PortalLogin';

export const ClientPortalView = ({ initialLoanId }: { initialLoanId: string }) => {
    const {
        isLoading, portalError, portalInfo,
        loginIdentifier, setLoginIdentifier, loginCode, setLoginCode,
        loggedClient, byeName, selectedLoanId,
        loan, installments, portalSignals, isAgreementActive,
        intentId, intentType, receiptPreview,
        handleLogin, handleLogout, handleSignalIntent, handleReceiptUpload
    } = useClientPortalLogic(initialLoanId);

    const [isNoteOpen, setIsNoteOpen] = useState(false);

    // Loader de inicialização
    if (isLoading && !loan && !portalError) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center max-w-md w-full shadow-2xl">
                    <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <h1 className="text-xl font-black text-white uppercase mb-2">Portal do Cliente</h1>
                    <p className="text-slate-400 text-sm">Validando sua segurança...</p>
                </div>
            </div>
        );
    }

    // Safety fallback
    const visibleDocuments = (loan?.policies_snapshot?.customDocuments || []).filter((d: any) => d && d.visibleToClient);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600"></div>
                
                <div className="p-8 pb-4 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 text-blue-500 rounded-2xl mb-4">
                        <ShieldCheck size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Portal do Cliente</h1>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Acesso Restrito ao Contrato</p>
                </div>

                {portalError && (
                    <div className="mx-8 mb-4 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3 animate-in shake duration-300">
                        <AlertCircle className="text-rose-500 flex-shrink-0" size={18}/>
                        <p className="text-rose-200 text-xs font-bold leading-tight">{portalError}</p>
                    </div>
                )}

                {byeName && (
                    <div className="mx-8 mb-4 bg-slate-800/50 border border-slate-700 p-3 rounded-xl text-center">
                        <p className="text-white text-xs font-medium">Sessão encerrada para <span className="font-bold">{byeName}</span>.</p>
                    </div>
                )}

                {!loggedClient ? (
                    <PortalLogin 
                        loginIdentifier={loginIdentifier}
                        setLoginIdentifier={setLoginIdentifier}
                        loginCode={loginCode}
                        setLoginCode={setLoginCode}
                        handleLogin={handleLogin}
                        isLoading={isLoading}
                        selectedLoanId={selectedLoanId}
                    />
                ) : (
                    <div className="px-8 pb-10 space-y-6">
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-left relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck size={60}/></div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bem-vindo(a),</p>
                            <p className="text-white font-black text-lg truncate leading-tight mb-3">{loggedClient.name}</p>
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-black uppercase border-t border-slate-800/50 pt-3">
                                <span>ID: <strong className="text-blue-500">{loggedClient.client_number || '-'}</strong></span>
                                <span>Código: <strong className="text-emerald-500">****</strong></span>
                            </div>
                            
                            {portalSignals.length > 0 && (
                                <div className="mt-4 p-3 rounded-xl bg-blue-600/10 border border-blue-500/20">
                                    <p className="text-[9px] text-blue-400 font-black uppercase mb-1">Última Solicitação</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-white font-bold">{portalSignals[0].status}</span>
                                        <span className="text-[10px] text-slate-500">{new Date(portalSignals[0].created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* EXTRATO SIMPLIFICADO */}
                        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 max-h-48 overflow-y-auto custom-scrollbar">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                {isAgreementActive ? <><Handshake size={12} className="text-indigo-500"/> Acordo de Pagamento</> : 'Extrato do Contrato'}
                            </p>
                            <div className="space-y-2">
                                {(installments || []).map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs py-2 border-b border-slate-800/50 last:border-0">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 font-bold">{p.numero_parcela}ª Parcela</span>
                                            <span className="text-[9px] text-slate-500">Venc. {new Date(p.data_vencimento).toLocaleDateString()}</span>
                                        </div>
                                        <span className={p.status === 'PAID' ? 'text-emerald-500 font-black' : 'text-white font-black'}>R$ {Number(p.valor_parcela || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => handleSignalIntent('PAGAR_PIX')} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                                Enviar Comprovante (PIX)
                            </button>
                            <button onClick={() => handleSignalIntent('RENEGOCIAR')} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2">
                                <RefreshCw size={14}/> Solicitar Renegociação
                            </button>
                        </div>

                        {/* ÁREA DE UPLOAD E INFO */}
                        {intentId && (
                            <div className="bg-slate-950 border border-blue-500/30 rounded-2xl p-5 text-left animate-in slide-in-from-top-2">
                                <p className="text-[10px] text-blue-400 mb-2 font-black uppercase tracking-widest">{intentType === 'PAGAR_PIX' ? 'Pagamento PIX' : 'Solicitação Ativa'}</p>
                                {portalInfo && <p className="text-xs text-emerald-400 mb-4 font-bold bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20">{portalInfo}</p>}
                                
                                <div className="mt-2 pt-3 border-t border-slate-800">
                                    <label className="block text-[10px] text-slate-500 uppercase font-black mb-2 flex items-center gap-2">
                                        <Upload size={14} className="text-blue-500"/> Selecionar Comprovante
                                    </label>
                                    <input 
                                        type="file" 
                                        accept="image/*,application/pdf" 
                                        className="text-xs text-slate-300 w-full file:bg-slate-800 file:border-none file:text-white file:px-4 file:py-2 file:rounded-lg file:mr-4 file:font-black file:uppercase file:text-[9px] cursor-pointer" 
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} 
                                    />
                                    {receiptPreview && <p className="text-[10px] text-emerald-500 mt-3 font-bold flex items-center gap-1"><ShieldCheck size={12}/> Arquivo pronto para envio.</p>}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <button onClick={() => setIsNoteOpen(true)} className="w-full py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-2xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-2">
                                <FileText size={14}/> Meus Documentos
                            </button>
                            <button onClick={handleLogout} className="w-full py-3 text-slate-600 hover:text-rose-500 font-black uppercase text-[9px] transition-all">Sair do Portal</button>
                        </div>

                        {isNoteOpen && (
                            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-200">
                                <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 max-w-md w-full shadow-2xl">
                                    <div className="flex justify-between items-center mb-8">
                                        <h2 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                                            <FileText className="text-blue-500"/> Documentos
                                        </h2>
                                        <button onClick={() => setIsNoteOpen(false)} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white"><RefreshCw size={20} className="rotate-45"/></button>
                                    </div>
                                    <div className="space-y-3">
                                        {visibleDocuments.length === 0 ? (
                                            <p className="text-slate-600 text-xs italic text-center py-6">Nenhum documento compartilhado pelo operador.</p>
                                        ) : (
                                            visibleDocuments.map((doc: any) => (
                                                <a key={doc.id} href={doc.url} target="_blank" className="block p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-bold hover:border-blue-500 transition-all flex items-center justify-between group">
                                                    {doc.name}
                                                    <ExternalLink size={14} className="text-slate-600 group-hover:text-blue-500"/>
                                                </a>
                                            ))
                                        )}
                                        <button onClick={() => openSystemPromissoriaPrint({ clientName: loggedClient.name, loanId: selectedLoanId, principal: Number(loan?.principal), interestRate: loan?.interest_rate })} className="flex items-center justify-center gap-3 w-full py-4 bg-slate-950 text-blue-500 border border-blue-500/20 rounded-2xl mt-4 text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">
                                            <Printer size={16}/> Imprimir Promissória
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
