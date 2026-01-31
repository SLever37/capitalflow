
import React, { useState, useMemo } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, Handshake, Upload, FileText, ExternalLink, Printer, FileSignature, CheckCircle2, Lock, Eye, X, Clock, Calendar } from 'lucide-react';
import { openSystemPromissoriaPrint } from '../../utils/printHelpers';
import { useClientPortalLogic } from './hooks/useClientPortalLogic';
import { PortalLogin } from './components/PortalLogin';
import { formatMoney } from '../../utils/formatters';
import { DocumentTemplates } from '../legal/templates/DocumentTemplates';

export const ClientPortalView = ({ initialLoanId }: { initialLoanId: string }) => {
    const {
        isLoading, portalError, portalInfo,
        loginIdentifier, setLoginIdentifier, loginCode, setLoginCode,
        loggedClient, byeName, selectedLoanId,
        loan, installments, portalSignals, isAgreementActive,
        intentId, intentType, receiptPreview,
        handleLogin, handleLogout, handleSignalIntent, handleReceiptUpload,
        handleSignDocument, isSigning
    } = useClientPortalLogic(initialLoanId);

    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<{type: 'CONFISSAO' | 'PROMISSORIA', html: string} | null>(null);

    // Lógica de Alerta Específico para o Cliente (Somente Prazos)
    const clientAlert = useMemo(() => {
        if (!installments || installments.length === 0) return null;
        
        // Pega a próxima parcela pendente (ou a primeira se todas pagas/pendentes)
        const nextInst = installments.find(i => i.status !== 'PAID');
        
        if (!nextInst) return { type: 'SUCCESS', msg: 'Contrato Quitado. Obrigado!' };

        const today = new Date();
        today.setHours(0,0,0,0);
        const due = new Date(nextInst.data_vencimento);
        due.setHours(0,0,0,0); // Normaliza para comparar apenas datas

        const diffTime = today.getTime() - due.getTime();
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Positivo = Atrasado

        // Regras estritas de exibição
        if (daysDiff > 0) {
            return { 
                type: 'LATE', 
                msg: `Parcela em atraso há ${daysDiff} dia(s).`,
                detail: 'Regularize para evitar bloqueios.'
            };
        }
        if (daysDiff === 0) {
            return { 
                type: 'URGENT', 
                msg: 'Sua parcela vence HOJE!',
                detail: 'Garanta seu pagamento até o fim do dia.'
            };
        }
        if (daysDiff >= -5) { // Mostra apenas se faltar 5 dias ou menos
            return { 
                type: 'INFO', 
                msg: `Vence em ${Math.abs(daysDiff)} dia(s).`,
                detail: `Programado para ${due.toLocaleDateString()}`
            };
        }

        return null; // Não mostra nada se estiver longe do vencimento
    }, [installments]);

    if (isLoading && !loan && !portalError) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center max-w-md w-full shadow-2xl">
                    <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <h1 className="text-xl font-black text-white uppercase mb-2">Portal do Cliente</h1>
                    <p className="text-slate-400 text-sm">Validando segurança jurídica...</p>
                </div>
            </div>
        );
    }

    const visibleDocuments = (loan?.policies_snapshot?.customDocuments || []).filter((d: any) => d && d.visibleToClient);

    const handlePreview = (type: 'CONFISSAO' | 'PROMISSORIA') => {
        if (!loan || !loggedClient) return;
        
        const data = {
            loanId: loan.id,
            creditorName: loan.creditor_name || 'Credor Registrado',
            creditorDoc: loan.creditor_document || 'N/A',
            creditorAddress: loan.creditor_address || 'Endereço comercial',
            debtorName: loggedClient.name,
            debtorDoc: loggedClient.document || loggedClient.cpf || loggedClient.cnpj,
            debtorAddress: loan.debtor_address || 'Endereço não informado',
            amount: loan.total_to_receive,
            dueDate: loan.installments?.[0]?.due_date || loan.start_date,
            city: loan.city || 'Manaus'
        };

        const html = type === 'CONFISSAO' 
            ? DocumentTemplates.confissaoDivida(data)
            : DocumentTemplates.notaPromissoria(data);
        
        setViewingDoc({ type, html });
    };

    if (!loggedClient) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600"></div>
                    <div className="p-8 pb-4 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 text-blue-500 rounded-2xl mb-4">
                            <ShieldCheck size={40} />
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Portal do Cliente</h1>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Acesso Seguro</p>
                    </div>
                    {portalError && (
                        <div className="mx-8 mb-4 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3 animate-in shake duration-300">
                            <AlertCircle className="text-rose-500 flex-shrink-0" size={18}/>
                            <p className="text-rose-200 text-xs font-bold leading-tight">{portalError}</p>
                        </div>
                    )}
                    <PortalLogin 
                        loginIdentifier={loginIdentifier}
                        setLoginIdentifier={setLoginIdentifier}
                        handleLogin={handleLogin}
                        isLoading={isLoading}
                        selectedLoanId={selectedLoanId}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600"></div>
                
                {/* HEADER CLIENTE */}
                <div className="p-6 bg-slate-950 border-b border-slate-800 relative">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bem-vindo(a),</p>
                            <p className="text-white font-black text-lg truncate leading-tight">{loggedClient.name.split(' ')[0]}</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                                ID: {loggedClient.client_number || '---'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-6 space-y-5 overflow-y-auto custom-scrollbar max-h-[75vh]">
                    
                    {/* ALERTA DE VENCIMENTO (Somente automático) */}
                    {clientAlert && clientAlert.type !== 'SUCCESS' && (
                        <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-lg ${
                            clientAlert.type === 'LATE' ? 'bg-rose-500/10 border-rose-500/30 shadow-rose-900/10' :
                            clientAlert.type === 'URGENT' ? 'bg-amber-500/10 border-amber-500/30 shadow-amber-900/10' :
                            'bg-blue-500/10 border-blue-500/20'
                        }`}>
                            <div className={`p-2 rounded-xl flex-shrink-0 ${
                                clientAlert.type === 'LATE' ? 'bg-rose-500 text-white' :
                                clientAlert.type === 'URGENT' ? 'bg-amber-500 text-black' :
                                'bg-blue-500 text-white'
                            }`}>
                                {clientAlert.type === 'LATE' ? <AlertCircle size={18}/> : <Clock size={18}/>}
                            </div>
                            <div>
                                <p className={`text-xs font-black uppercase ${
                                    clientAlert.type === 'LATE' ? 'text-rose-400' :
                                    clientAlert.type === 'URGENT' ? 'text-amber-400' :
                                    'text-blue-400'
                                }`}>
                                    {clientAlert.msg}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium leading-tight mt-1">
                                    {clientAlert.detail}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ÁREA JURÍDICA - BLINDAGEM */}
                    <div className="bg-indigo-950/20 border border-indigo-500/30 p-4 rounded-2xl animate-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-center mb-3">
                            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <FileSignature size={14}/> Formalização Legal
                            </h3>
                            <span className="bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded">Pendência</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                            É necessário formalizar sua assinatura eletrônica na <b>Confissão de Dívida</b> e <b>Nota Promissória</b> para regularizar o cadastro.
                            </p>
                            <button 
                            onClick={() => setIsLegalOpen(true)}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                            >
                            Visualizar e Assinar Títulos
                            </button>
                    </div>

                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <FileText size={12}/> Extrato do Contrato
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {(installments || []).map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs py-2 border-b border-slate-800/50 last:border-0">
                                    <div className="flex flex-col">
                                        <span className={`font-bold ${p.status === 'LATE' ? 'text-rose-400' : 'text-slate-300'}`}>
                                            {p.numero_parcela}ª Parcela
                                        </span>
                                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                                            <Calendar size={8}/> {new Date(p.data_vencimento).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className={p.status === 'PAID' ? 'text-emerald-500 font-black' : 'text-white font-black'}>
                                            R$ {Number(p.valor_parcela || 0).toFixed(2)}
                                        </span>
                                        {p.status === 'PAID' && <p className="text-[8px] text-emerald-500 uppercase font-black">Pago</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button onClick={() => handleSignalIntent('PAGAR_PIX')} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                            Pagar via PIX
                        </button>
                    </div>

                    {/* MODAL JURÍDICO INTERNO */}
                    {isLegalOpen && (
                        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                            <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-indigo-500/30 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                                        <Lock className="text-indigo-500" size={16}/> Assinatura Digital
                                    </h2>
                                    <button onClick={() => setIsLegalOpen(false)} className="bg-slate-800 p-2 rounded-full text-slate-400"><X size={18}/></button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-6 space-y-4">
                                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-[10px] text-indigo-400 font-black uppercase">Confissão de Dívida (Art. 784 CPC)</p>
                                            <button onClick={() => handlePreview('CONFISSAO')} className="text-blue-500 hover:text-blue-400 transition-colors"><Eye size={16}/></button>
                                        </div>
                                        <p className="text-xs text-white leading-relaxed mb-3">Reconhecimento formal da dívida total (Capital + Juros). Permite execução imediata em caso de inadimplência.</p>
                                        <button 
                                            onClick={() => handleSignDocument('CONFISSAO')}
                                            disabled={isSigning}
                                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2"
                                        >
                                            {isSigning ? <RefreshCw className="animate-spin" size={14}/> : <><FileSignature size={14}/> Assinar Eletronicamente</>}
                                        </button>
                                    </div>

                                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-[10px] text-blue-400 font-black uppercase">Nota Promissória (Dec. 2.044/08)</p>
                                            <button onClick={() => handlePreview('PROMISSORIA')} className="text-blue-500 hover:text-blue-400 transition-colors"><Eye size={16}/></button>
                                        </div>
                                        <p className="text-xs text-white leading-relaxed mb-3">Título de crédito autônomo. Promessa incondicional de pagamento no valor de <b>{formatMoney(loan.total_to_receive)}</b>.</p>
                                        <button 
                                            onClick={() => handleSignDocument('PROMISSORIA')}
                                            disabled={isSigning}
                                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2"
                                        >
                                            {isSigning ? <RefreshCw className="animate-spin" size={14}/> : <><FileSignature size={14}/> Assinar Eletronicamente</>}
                                        </button>
                                    </div>

                                    <div className="bg-indigo-900/10 border border-indigo-500/20 p-4 rounded-xl">
                                        <p className="text-[9px] text-indigo-300 leading-relaxed font-medium">
                                            <b>Nota de Compliance:</b> Ao assinar, você concorda com a validade jurídica deste ato conforme Lei 14.063/2020. O sistema registra seu IP <b>(auditado)</b> como prova técnica.
                                        </p>
                                    </div>
                                </div>
                                
                                <button onClick={() => setIsLegalOpen(false)} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px]">Fechar</button>
                            </div>
                        </div>
                    )}

                    {/* PREVIEW MODAL */}
                    {viewingDoc && (
                        <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden">
                            <div className="bg-slate-900 p-4 flex justify-between items-center shadow-lg">
                                <h3 className="text-white font-black uppercase text-xs">Visualização do Documento</h3>
                                <button onClick={() => setViewingDoc(null)} className="p-2 bg-slate-800 text-white rounded-full"><X size={20}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto bg-slate-100">
                                <div className="max-w-3xl mx-auto bg-white shadow-2xl min-h-screen">
                                    <iframe 
                                        srcDoc={viewingDoc.html} 
                                        className="w-full h-screen border-none"
                                        title="Document Preview"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <button onClick={handleLogout} className="w-full py-3 text-slate-600 hover:text-rose-500 font-black uppercase text-[9px] transition-all">Sair do Portal</button>
                </div>
            </div>
        </div>
    );
};
