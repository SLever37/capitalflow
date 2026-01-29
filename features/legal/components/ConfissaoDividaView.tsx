
import React, { useState } from 'react';
import { ArrowLeft, Scroll, FilePlus, UserCheck, ShieldCheck, Link as LinkIcon, FileSignature, Users } from 'lucide-react';
import { Loan, UserProfile } from '../../../types';
import { formatMoney } from '../../../utils/formatters';
import { DocumentTemplates } from '../templates/DocumentTemplates';

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

    const handlePrint = () => {
        if (!selectedLoan || !activeUser) return;
        const html = DocumentTemplates.confissaoDivida({
            loanId: selectedLoan.id,
            creditorName: activeUser.fullName || activeUser.businessName || activeUser.name,
            creditorDoc: activeUser.document,
            creditorAddress: activeUser.address || 'Endereço não informado',
            debtorName: selectedLoan.debtorName,
            debtorDoc: selectedLoan.debtorDocument,
            debtorAddress: selectedLoan.debtorAddress,
            amount: selectedLoan.totalToReceive,
            finePercent: selectedLoan.finePercent,
            dailyInterestPercent: selectedLoan.dailyInterestPercent,
            city: activeUser.city || 'Manaus'
        });
        
        const win = window.open('', '_blank');
        win?.document.write(html);
        win?.document.close();
        setTimeout(() => win?.print(), 500);
    };

    const handleCopyPortalLink = () => {
        if (!selectedLoan) return;
        const url = `${window.location.origin}/?portal=${selectedLoan.id}`;
        navigator.clipboard.writeText(url);
        showToast("Link do Portal do Cliente copiado!", "success");
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
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">2. Testemunhas e Ações</h3>
                    <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                             <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                <Users size={16}/>
                                <span className="text-[10px] font-black uppercase">Testemunhas (Obrigatório p/ Execução)</span>
                             </div>
                             <div className="grid grid-cols-1 gap-2">
                                <input placeholder="Nome Testemunha 1" className="bg-slate-900 border border-slate-800 p-2 rounded text-xs text-white outline-none focus:border-indigo-500" value={witness1} onChange={e => setWitness1(e.target.value)} />
                                <input placeholder="Nome Testemunha 2" className="bg-slate-900 border border-slate-800 p-2 rounded text-xs text-white outline-none focus:border-indigo-500" value={witness2} onChange={e => setWitness2(e.target.value)} />
                             </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button 
                                onClick={handlePrint}
                                disabled={!selectedLoan}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <FileSignature size={18}/> Gerar Documento PDF
                            </button>
                            <button 
                                onClick={handleCopyPortalLink}
                                disabled={!selectedLoan}
                                className="w-full py-4 bg-slate-800 text-blue-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <LinkIcon size={18}/> Link p/ Assinatura
                            </button>
                        </div>

                        <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
                            <ShieldCheck size={20} className="text-indigo-400 shrink-0 mt-1"/>
                            <p className="text-[10px] text-indigo-200 leading-relaxed">
                                <b>Importante:</b> Para ter força de título executivo extrajudicial (Art. 784, III CPC), o documento impresso deve ser assinado por 2 testemunhas identificadas. Para assinaturas digitais, utilize o link do Portal do Cliente.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
