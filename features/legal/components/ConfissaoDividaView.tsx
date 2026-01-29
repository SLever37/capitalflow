
import React, { useState } from 'react';
import { ArrowLeft, Scroll, FilePlus, UserCheck, ShieldCheck, Scale, Link as LinkIcon, FileSignature } from 'lucide-react';
import { Loan, UserProfile } from '../../../types';
import { formatMoney } from '../../../utils/formatters';
import { legalService } from '../services/legalService';
import { legalPublicService } from '../services/legalPublic.service';

interface ConfissaoDividaViewProps {
    loans: Loan[];
    activeUser: UserProfile | null;
    onBack: () => void;
    showToast: (msg: string, type?: any) => void;
}

export const ConfissaoDividaView: React.FC<ConfissaoDividaViewProps> = ({ loans, activeUser, onBack, showToast }) => {
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [witness1, setWitness1] = useState('');
    const [witness2, setWitness2] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const eligibleLoans = loans.filter(l => !l.isArchived && l.installments.some(i => i.status !== 'PAID'));

    const handleGenerate = async () => {
        if (!selectedLoan || !activeUser) return;
        setIsGenerating(true);
        try {
            const params = legalService.prepareDocumentParams(
                selectedLoan.activeAgreement || { 
                    id: 'original', 
                    negotiatedTotal: selectedLoan.totalToReceive, 
                    installments: selectedLoan.installments as any,
                    createdAt: new Date().toISOString()
                } as any, 
                selectedLoan, 
                activeUser
            );

            const doc = await legalService.generateAndRegisterDocument(
                selectedLoan.id, 
                { ...params, city: activeUser.city || 'Manaus' }, 
                activeUser.id
            );

            const link = await legalPublicService.generateSigningLink(doc.id);
            navigator.clipboard.writeText(link);
            showToast("Documento gerado e link de assinatura copiado!", "success");
            setSelectedLoan(null);
        } catch (e) {
            showToast("Erro ao gerar documento legal.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={20}/>
                </button>
                <div>
                    <h2 className="text-xl font-black text-white uppercase flex items-center gap-2">
                        <Scroll className="text-indigo-500" size={24}/> Confissão de Dívida
                    </h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Título Executivo (Art. 784 CPC)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">1. Selecionar Contrato</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                        {eligibleLoans.map(loan => (
                            <button 
                                key={loan.id} 
                                onClick={() => setSelectedLoan(loan)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedLoan?.id === loan.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                            >
                                <div className="text-left">
                                    <p className="font-bold text-sm uppercase">{loan.debtorName}</p>
                                    <p className="text-[10px] opacity-70">Dívida: {formatMoney(loan.totalToReceive)}</p>
                                </div>
                                <UserCheck size={18}/>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] space-y-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">2. Dados das Testemunhas</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Testemunha 01 (Nome/CPF)</label>
                            <input 
                                value={witness1} onChange={e => setWitness1(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                                placeholder="Ex: João da Silva - 000.000.000-00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Testemunha 02 (Nome/CPF)</label>
                            <input 
                                value={witness2} onChange={e => setWitness2(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                                placeholder="Ex: Maria Souza - 111.111.111-11"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
                        <ShieldCheck size={20} className="text-indigo-400 shrink-0 mt-1"/>
                        <p className="text-[10px] text-indigo-200 leading-relaxed">
                            <b>Compliance:</b> A assinatura de duas testemunhas é requisito do Art. 784, III do CPC para que este documento possa ser executado judicialmente sem processo de conhecimento prévio.
                        </p>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={!selectedLoan || isGenerating}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? 'Processando...' : <><FileSignature size={18}/> Gerar e Enviar para Assinatura</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
