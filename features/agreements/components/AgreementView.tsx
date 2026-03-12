
import React, { useState } from 'react';
import { Agreement, AgreementInstallment, Loan } from "../../../types";
import { formatMoney } from "../../../utils/formatters";
import { Calendar, CheckCircle2, AlertTriangle, XCircle, DollarSign, History, Scale, ArrowLeft } from "lucide-react";
import { agreementService } from "../services/agreementService";
import { LegalDocumentModal } from "../../legal/components/LegalDocumentModal";

interface AgreementViewProps {
    agreement: Agreement;
    loan: Loan;
    activeUser: any;
    onUpdate: () => void;
    onPayment: (inst: AgreementInstallment) => void;
}

export const AgreementView: React.FC<AgreementViewProps> = ({ agreement, loan, activeUser, onUpdate, onPayment }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showLegalModal, setShowLegalModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'BREAK' | 'ACTIVATE' | null>(null);

    const handleBreak = async () => {
        setIsProcessing(true);
        try {
            await agreementService.breakAgreement(agreement.id);
            onUpdate();
            setConfirmAction(null);
        } catch (e) {
            console.error("Erro ao quebrar acordo:", e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleActivate = async () => {
        setIsProcessing(true);
        try {
            await agreementService.activateAgreement(agreement.id);
            onUpdate();
            setConfirmAction(null);
        } catch (e) {
            console.error("Erro ao reativar acordo:", e);
        } finally {
            setIsProcessing(false);
        }
    };

    if (agreement.status === 'BROKEN' || agreement.status === 'QUEBRADO') {
        return (
            <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-2xl text-center">
                <p className="text-rose-500 font-black uppercase text-xs mb-1">Acordo Quebrado</p>
                <p className="text-slate-400 text-[10px]">Este acordo foi cancelado. O contrato original está vigente.</p>
                
                {confirmAction === 'ACTIVATE' ? (
                    <div className="mt-3 flex items-center justify-center gap-2">
                        <button 
                            onClick={handleActivate}
                            disabled={isProcessing}
                            className="bg-rose-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg hover:bg-rose-600 transition-all"
                        >
                            {isProcessing ? 'Processando...' : 'Confirmar Reativação'}
                        </button>
                        <button 
                            onClick={() => setConfirmAction(null)}
                            className="text-slate-500 text-[9px] font-black uppercase px-3 py-1.5 hover:text-white transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setConfirmAction('ACTIVATE')}
                        className="mt-2 text-[9px] font-black uppercase text-rose-400 hover:text-white transition-colors"
                    >
                        Reativar Acordo
                    </button>
                )}
            </div>
        );
    }

    if (agreement.status === 'PAID' || agreement.status === 'PAGO' || agreement.status === 'FINALIZADO') {
        return (
            <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl text-center">
                <div className="flex justify-center mb-2"><CheckCircle2 className="text-emerald-500" size={24}/></div>
                <p className="text-emerald-500 font-black uppercase text-xs mb-1">Acordo Quitado</p>
                <p className="text-slate-400 text-[10px] mb-2">Todos os débitos foram regularizados.</p>
                
                {confirmAction === 'ACTIVATE' ? (
                    <div className="mt-2 flex items-center justify-center gap-2">
                        <button 
                            onClick={handleActivate}
                            disabled={isProcessing}
                            className="bg-emerald-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition-all"
                        >
                            {isProcessing ? 'Processando...' : 'Confirmar Reabertura'}
                        </button>
                        <button 
                            onClick={() => setConfirmAction(null)}
                            className="text-slate-500 text-[9px] font-black uppercase px-3 py-1.5 hover:text-white transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setConfirmAction('ACTIVATE')}
                        className="text-[9px] font-black uppercase text-emerald-400 hover:text-white transition-colors"
                    >
                        Ativar Acordo (Reabrir)
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-4 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
                        <History size={16}/>
                    </div>
                    <div>
                        <h4 className="text-indigo-400 font-black uppercase text-[10px] tracking-widest">Acordo Ativo</h4>
                        <p className="text-white font-bold text-xs">{agreement.type?.replace(/_/g, ' ')}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setShowLegalModal(true); }} className="p-2 text-indigo-300 hover:text-white hover:bg-indigo-600 rounded-lg border border-indigo-500/30 transition-all" title="Jurídico">
                        <Scale size={14}/>
                    </button>
                    
                    {confirmAction === 'BREAK' ? (
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleBreak(); }}
                                disabled={isProcessing}
                                className="bg-rose-600 text-white text-[8px] font-black uppercase px-2 py-1.5 rounded-lg hover:bg-rose-500 transition-all"
                            >
                                {isProcessing ? '...' : 'Confirmar'}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setConfirmAction(null); }}
                                className="text-slate-500 text-[8px] font-black uppercase px-1 py-1.5 hover:text-white transition-all"
                            >
                                <XCircle size={14} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={(e) => { e.stopPropagation(); setConfirmAction('BREAK'); }} className="text-[9px] font-black uppercase text-rose-500 hover:text-white hover:bg-rose-500 px-3 py-1.5 rounded-lg border border-rose-500/30 transition-all">
                            Quebrar
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Dívida Base</p>
                    <p className="text-[11px] font-bold text-slate-300">{formatMoney(agreement.totalDebtAtNegotiation)}</p>
                </div>
                <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Total Negociado</p>
                    <p className="text-[11px] font-bold text-white">{formatMoney(agreement.negotiatedTotal)}</p>
                </div>
            </div>

            <div className="space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {(agreement.installments || []).sort((a,b) => {
                    const isAPaid = a.status === 'PAID' || a.status === 'PAGO';
                    const isBPaid = b.status === 'PAID' || b.status === 'PAGO';
                    if (isAPaid && !isBPaid) return 1;
                    if (!isAPaid && isBPaid) return -1;
                    return a.number - b.number;
                }).map(inst => {
                    const isPaid = inst.status === 'PAID' || inst.status === 'PAGO';
                    return (
                    <div id={inst.id} key={inst.id} className={`flex justify-between items-center px-3 py-2 rounded-lg border ${isPaid ? 'bg-emerald-500/5 border-emerald-500/10 opacity-60' : 'bg-slate-900/60 border-slate-800/50'}`}>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 w-4">{inst.number}</span>
                            <div>
                                <p className="text-[11px] font-bold text-slate-200">{formatMoney(inst.amount)}</p>
                                <p className="text-[9px] text-slate-500 font-medium">{new Date(inst.dueDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {!isPaid ? (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onPayment(inst); }} 
                                    className="text-[9px] font-black uppercase bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-md hover:bg-blue-600 hover:text-white transition-all"
                                >
                                    Pagar
                                </button>
                            ) : (
                                <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1">
                                    <CheckCircle2 size={10}/> Pago
                                </span>
                            )}
                        </div>
                    </div>
                );}) }
            </div>


            {showLegalModal && (
                <LegalDocumentModal 
                    agreement={agreement} 
                    loan={loan} 
                    activeUser={activeUser}
                    onClose={() => setShowLegalModal(false)} 
                />
            )}
        </div>
    );
};
