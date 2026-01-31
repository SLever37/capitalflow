
import React, { useState } from 'react';
import { ArrowLeft, Scroll, UserCheck, ShieldCheck, Link as LinkIcon, FileSignature, Users, Copy, Check, User, MapPin } from 'lucide-react';
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
    
    // Estados para Credor (Editável no momento da geração - Puxa do Perfil Jurídico)
    const [creditorName, setCreditorName] = useState(activeUser?.fullName || activeUser?.businessName || activeUser?.name || '');
    const [creditorDoc, setCreditorDoc] = useState(activeUser?.document || '');
    const [creditorAddress, setCreditorAddress] = useState(activeUser?.address || '');

    // Estados para Testemunhas
    const [witness1Name, setWitness1Name] = useState('');
    const [witness1Doc, setWitness1Doc] = useState('');
    const [witness2Name, setWitness2Name] = useState('');
    const [witness2Doc, setWitness2Doc] = useState('');
    
    const eligibleLoans = loans.filter(l => !l.isArchived && l.installments.some(i => i.status !== 'PAID'));

    const handlePrint = () => {
        if (!selectedLoan || !activeUser) return;
        
        // Passa as testemunhas e dados do credor explicitamente para o template
        const html = DocumentTemplates.confissaoDivida({
            loanId: selectedLoan.id,
            creditorName: creditorName.toUpperCase(),
            creditorDoc: creditorDoc,
            creditorAddress: creditorAddress || 'Endereço não informado',
            debtorName: selectedLoan.debtorName,
            debtorDoc: selectedLoan.debtorDocument,
            debtorAddress: selectedLoan.debtorAddress,
            amount: selectedLoan.totalToReceive,
            finePercent: selectedLoan.finePercent,
            dailyInterestPercent: selectedLoan.dailyInterestPercent,
            city: activeUser.city || 'Manaus',
            witnesses: [
                { name: witness1Name, document: witness1Doc },
                { name: witness2Name, document: witness2Doc }
            ]
        });
        
        const win = window.open('', '_blank');
        win?.document.write(html);
        win?.document.close();
        setTimeout(() => win?.print(), 500);
    };

    const copySigningLink = (role: 'DEVEDOR' | 'TESTEMUNHA_1' | 'TESTEMUNHA_2') => {
        if (!selectedLoan) return;
        let url = `${window.location.origin}/?portal=${selectedLoan.id}`;
        
        // Adiciona contexto para a página pública saber quem deve assinar
        if (role === 'DEVEDOR') {
            url += `&role=DEVEDOR`;
        } else if (role === 'TESTEMUNHA_1') {
            url += `&role=TESTEMUNHA&idx=0&name=${encodeURIComponent(witness1Name)}&doc=${encodeURIComponent(witness1Doc)}`;
        } else if (role === 'TESTEMUNHA_2') {
            url += `&role=TESTEMUNHA&idx=1&name=${encodeURIComponent(witness2Name)}&doc=${encodeURIComponent(witness2Doc)}`;
        }

        navigator.clipboard.writeText(url);
        showToast(`Link para ${role.replace('_', ' ')} copiado!`, "success");
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
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">2. Dados do Documento</h3>
                    
                    <div className="space-y-4">
                        
                        {/* CREDOR */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                             <div className="flex items-center gap-2 text-blue-400 mb-3">
                                <User size={16}/>
                                <span className="text-[10px] font-black uppercase">Seus Dados (Credor)</span>
                             </div>
                             <div className="space-y-3">
                                <div>
                                    <label className="text-[9px] text-slate-500 font-bold ml-1 block mb-1">Nome Completo (Conforme Perfil)</label>
                                    <input className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs text-white outline-none focus:border-blue-500" value={creditorName} onChange={e => setCreditorName(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[9px] text-slate-500 font-bold ml-1 block mb-1">CPF / CNPJ</label>
                                        <input className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs text-white outline-none focus:border-blue-500" value={creditorDoc} onChange={e => setCreditorDoc(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-slate-500 font-bold ml-1 block mb-1">Endereço Completo</label>
                                        <input className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs text-white outline-none focus:border-blue-500" value={creditorAddress} onChange={e => setCreditorAddress(e.target.value)} placeholder="Rua, Nº, Bairro, Cidade-UF" />
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* TESTEMUNHAS */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                             <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                <Users size={16}/>
                                <span className="text-[10px] font-black uppercase">Testemunhas (Recomendado)</span>
                             </div>
                             
                             {/* Testemunha 1 */}
                             <div className="mb-3 pb-3 border-b border-slate-800 border-dashed">
                                 <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Testemunha 1</p>
                                 <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input placeholder="Nome Completo" className="bg-slate-900 border border-slate-800 p-2 rounded text-xs text-white outline-none focus:border-indigo-500" value={witness1Name} onChange={e => setWitness1Name(e.target.value)} />
                                    <input placeholder="CPF" className="bg-slate-900 border border-slate-800 p-2 rounded text-xs text-white outline-none focus:border-indigo-500" value={witness1Doc} onChange={e => setWitness1Doc(e.target.value)} />
                                 </div>
                                 <button onClick={() => copySigningLink('TESTEMUNHA_1')} disabled={!selectedLoan} className="w-full py-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[9px] font-bold uppercase flex items-center justify-center gap-2 transition-all">
                                     <LinkIcon size={12}/> Copiar Link Testemunha 1
                                 </button>
                             </div>

                             {/* Testemunha 2 */}
                             <div>
                                 <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Testemunha 2</p>
                                 <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input placeholder="Nome Completo" className="bg-slate-900 border border-slate-800 p-2 rounded text-xs text-white outline-none focus:border-indigo-500" value={witness2Name} onChange={e => setWitness2Name(e.target.value)} />
                                    <input placeholder="CPF" className="bg-slate-900 border border-slate-800 p-2 rounded text-xs text-white outline-none focus:border-indigo-500" value={witness2Doc} onChange={e => setWitness2Doc(e.target.value)} />
                                 </div>
                                 <button onClick={() => copySigningLink('TESTEMUNHA_2')} disabled={!selectedLoan} className="w-full py-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[9px] font-bold uppercase flex items-center justify-center gap-2 transition-all">
                                     <LinkIcon size={12}/> Copiar Link Testemunha 2
                                 </button>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button 
                                onClick={handlePrint}
                                disabled={!selectedLoan}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <FileSignature size={18}/> Gerar PDF c/ Nomes
                            </button>
                            <button 
                                onClick={() => copySigningLink('DEVEDOR')}
                                disabled={!selectedLoan}
                                className="w-full py-4 bg-slate-800 text-blue-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <LinkIcon size={18}/> Link do Devedor
                            </button>
                        </div>

                        <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
                            <ShieldCheck size={20} className="text-indigo-400 shrink-0 mt-1"/>
                            <p className="text-[10px] text-indigo-200 leading-relaxed">
                                <b>Importante:</b> Envie o link específico para cada parte. A assinatura digital registra IP e horário, validando o ato conforme MP 2.200-2/2001.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
