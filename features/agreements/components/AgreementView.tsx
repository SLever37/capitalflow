
import React, { useState } from 'react';
import { Agreement, AgreementInstallment, Loan } from "../../../types";
import { formatMoney } from "../../../utils/formatters";
import { Calendar, CheckCircle2, AlertTriangle, XCircle, DollarSign, History } from "lucide-react";
import { agreementService } from "../services/agreementService";

interface AgreementViewProps {
    agreement: Agreement;
    loan: Loan;
    activeUser: any;
    onUpdate: () => void;
    onPayment: (inst: AgreementInstallment) => void;
}

export const AgreementView: React.FC<AgreementViewProps> = ({ agreement, loan, activeUser, onUpdate, onPayment }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleBreak = async () => {
        if (!confirm("Deseja realmente quebrar o acordo? A dívida original será restaurada.")) return;
        setIsProcessing(true);
        try {
            await agreementService.breakAgreement(agreement.id);
            onUpdate();
        } catch (e) {
            alert("Erro ao quebrar acordo.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (agreement.status === 'BROKEN') {
        return (
            <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-2xl text-center">
                <p className="text-rose-500 font-black uppercase text-xs mb-1">Acordo Quebrado</p>
                <p className="text-slate-400 text-[10px]">Este acordo foi cancelado. O contrato original está vigente.</p>
            </div>
        );
    }

    if (agreement.status === 'PAID') {
        return (
            <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl text-center">
                <div className="flex justify-center mb-2"><CheckCircle2 className="text-emerald-500" size={32}/></div>
                <p className="text-emerald-500 font-black uppercase text-sm mb-1">Acordo Quitado</p>
                <p className="text-slate-400 text-[10px]">Todos os débitos foram regularizados.</p>
            </div>
        );
    }

    return (
        <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-indigo-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        <History size={14}/> Acordo em Andamento
                    </h4>
                    <p className="text-white font-bold text-sm mt-1">{agreement.type.replace('_', ' ')}</p>
                </div>
                <button onClick={handleBreak} className="text-[9px] font-bold text-rose-500 hover:text-white hover:bg-rose-500 px-3 py-1.5 rounded-lg border border-rose-500/30 transition-all uppercase">
                    Quebrar Acordo
                </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {agreement.installments.sort((a,b) => a.number - b.number).map(inst => (
                    <div key={inst.id} className={`flex justify-between items-center p-3 rounded-xl border ${inst.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-900 border-slate-800'}`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase">{inst.number}ª Parcela</p>
                            <p className="text-xs text-slate-300 flex items-center gap-1"><Calendar size={10}/> {new Date(inst.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm font-black ${inst.status === 'PAID' ? 'text-emerald-500' : 'text-white'}`}>
                                {formatMoney(inst.amount)}
                            </p>
                            {inst.status !== 'PAID' && (
                                <button onClick={() => onPayment(inst)} className="mt-1 text-[9px] font-bold uppercase bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-500 transition-colors flex items-center gap-1 ml-auto">
                                    <DollarSign size={10}/> Pagar
                                </button>
                            )}
                            {inst.status === 'PAID' && <span className="text-[9px] font-bold text-emerald-500 uppercase">Pago</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
