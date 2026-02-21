
import React, { useState, useEffect } from 'react';
import { Loan } from "../../../types";
import { Modal } from "../../../components/ui/Modal";
import { Calculator, Calendar, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { simulateAgreement } from "../logic/calculations";
import { formatMoney } from "../../../utils/formatters";
import { agreementService } from "../services/agreementService";

interface RenegotiationModalProps {
    loan: Loan;
    activeUser: any;
    onClose: () => void;
    onSuccess: () => void;
}

export const RenegotiationModal: React.FC<RenegotiationModalProps> = ({ loan, activeUser, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [type, setType] = useState<'PARCELADO_COM_JUROS' | 'PARCELADO_SEM_JUROS'>('PARCELADO_COM_JUROS');
    const [installmentsCount, setInstallmentsCount] = useState(1);
    const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('MONTHLY');
    const [interestRate, setInterestRate] = useState(5); // 5% ao mês padrão
    const [firstDueDate, setFirstDueDate] = useState('');
    const [totalDebt, setTotalDebt] = useState(0);
    
    const [simulation, setSimulation] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Calcula dívida total atual (Principal + Juros + Multas acumuladas)
        const debt = loan.installments.reduce((acc, i) => acc + (i.principalRemaining + i.interestRemaining + (i.lateFeeAccrued || 0)), 0);
        setTotalDebt(debt);
        
        // Data default: Amanhã
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFirstDueDate(tomorrow.toISOString().split('T')[0]);
    }, [loan]);

    const handleSimulate = () => {
        const result = simulateAgreement({
            totalDebt,
            type,
            installmentsCount,
            interestRate,
            firstDueDate,
            frequency
        });
        setSimulation(result);
        setStep(2);
    };

    const handleConfirm = async () => {
        if (!simulation) return;
        setIsSaving(true);
        try {
            await agreementService.createAgreement(
                loan.id,
                {
                    loanId: loan.id,
                    type,
                    totalDebtAtNegotiation: totalDebt,
                    negotiatedTotal: simulation.negotiatedTotal,
                    interestRate,
                    installmentsCount,
                    frequency,
                    startDate: new Date().toISOString()
                },
                simulation.installments,
                activeUser.id
            );
            onSuccess();
            onClose();
        } catch (e) {
            alert("Erro ao criar acordo.");
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal onClose={onClose} title="Acordo de Inadimplência">
            <div className="space-y-6">
                {step === 1 && (
                    <div className="space-y-4 animate-in slide-in-from-right">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                            <p className="text-[10px] uppercase font-black text-slate-500">Dívida Atual Calculada</p>
                            <p className="text-3xl font-black text-rose-500">{formatMoney(totalDebt)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setType('PARCELADO_COM_JUROS')} className={`p-4 rounded-2xl border transition-all ${type === 'PARCELADO_COM_JUROS' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                                <p className="font-bold text-xs uppercase mb-1">Parcelado c/ Juros</p>
                                <p className="text-[9px] opacity-70">Recalcula dívida com nova taxa</p>
                            </button>
                            <button onClick={() => setType('PARCELADO_SEM_JUROS')} className={`p-4 rounded-2xl border transition-all ${type === 'PARCELADO_SEM_JUROS' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                                <p className="font-bold text-xs uppercase mb-1">Sem Juros (Fixar)</p>
                                <p className="text-[9px] opacity-70">Congela o valor atual</p>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">Nº Parcelas</label>
                                <input type="number" min="1" max="60" value={installmentsCount} onChange={e => setInstallmentsCount(parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">Periodicidade</label>
                                <select value={frequency} onChange={e => setFrequency(e.target.value as any)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none">
                                    <option value="MONTHLY">Mensal</option>
                                    <option value="BIWEEKLY">Quinzenal</option>
                                    <option value="WEEKLY">Semanal</option>
                                </select>
                            </div>
                        </div>

                        {type === 'PARCELADO_COM_JUROS' && (
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">Taxa de Juros (% ao mês)</label>
                                <input type="number" step="0.1" value={interestRate} onChange={e => setInterestRate(parseFloat(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none" />
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500">1º Vencimento</label>
                            <input type="date" value={firstDueDate || ''} onChange={e => setFirstDueDate(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none" />
                        </div>

                        <button onClick={handleSimulate} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                            <Calculator size={16}/> Simular Acordo
                        </button>
                    </div>
                )}

                {step === 2 && simulation && (
                    <div className="space-y-4 animate-in slide-in-from-right">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">Novo Total</p>
                                    <p className="text-2xl font-black text-white">{formatMoney(simulation.negotiatedTotal)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-slate-500">Parcelas</p>
                                    <p className="text-xl font-bold text-blue-400">{installmentsCount}x {formatMoney(simulation.installments[0].amount)}</p>
                                </div>
                            </div>
                            
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2">
                                {simulation.installments.map((inst: any) => (
                                    <div key={inst.number} className="flex justify-between items-center bg-slate-900 p-2 rounded-lg text-xs">
                                        <span className="text-slate-400 font-bold">{inst.number}ª</span>
                                        <span className="text-slate-500">{new Date(inst.dueDate).toLocaleDateString()}</span>
                                        <span className="text-white font-bold">{formatMoney(inst.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-amber-900/20 border border-amber-500/30 p-3 rounded-xl flex items-start gap-3">
                            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-1"/>
                            <p className="text-[10px] text-amber-200 leading-relaxed">
                                <b>Atenção:</b> Ao confirmar, o contrato original será congelado e este acordo passará a ser a cobrança vigente. Se o acordo for quebrado, a dívida original retorna.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase text-xs">Voltar</button>
                            <button onClick={handleConfirm} disabled={isSaving} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                                {isSaving ? 'Processando...' : <><CheckCircle2 size={16}/> Confirmar Acordo</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
