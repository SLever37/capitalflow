
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Scroll, UserCheck, ShieldCheck, Link as LinkIcon, FileSignature, Users, User, MapPin, Save, Loader2, Scale } from 'lucide-react';
import { Loan, UserProfile, LegalWitness, LegalDocumentParams } from '../../../types';
import { formatMoney } from '../../../utils/formatters';
import { DocumentTemplates } from '../templates/DocumentTemplates';
import { legalService } from '../services/legalService';
import { witnessService } from '../services/witness.service';
import { WitnessBaseManager } from './WitnessBaseManager';

interface ConfissaoDividaViewProps {
    loans: Loan[];
    activeUser: UserProfile | null;
    onBack: () => void;
    showToast: (msg: string, type?: any) => void;
}

export const ConfissaoDividaView: React.FC<ConfissaoDividaViewProps> = ({ loans, activeUser, onBack, showToast }) => {
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showManager, setShowManager] = useState(false);
    
    const [availableWitnesses, setAvailableWitnesses] = useState<LegalWitness[]>([]);
    const [selectedW1, setSelectedW1] = useState<string>('');
    const [selectedW2, setSelectedW2] = useState<string>('');

    const creditorName = activeUser?.fullName || activeUser?.businessName || activeUser?.name || '';
    const creditorDoc = activeUser?.document || '';
    const creditorFullAddress = `${activeUser?.address || ''}, ${activeUser?.addressNumber || ''} - ${activeUser?.neighborhood || ''}, ${activeUser?.city || ''}/${activeUser?.state || ''}`;

    // CARREGAMENTO DE TESTEMUNHAS
    const loadWitnesses = useCallback(async () => {
        if (!activeUser || activeUser.id === 'DEMO') return;
        try {
            const data = await witnessService.list(activeUser.id);
            setAvailableWitnesses(data);
        } catch (e) {
            console.error("Erro ao listar testemunhas", e);
        }
    }, [activeUser]);

    // Recarrega sempre que o usuário logar OU sempre que fechar o gerenciador (showManager muda para false)
    useEffect(() => {
        loadWitnesses();
    }, [loadWitnesses, showManager]);

    const handleGenerateAndSave = async () => {
        if (!selectedLoan || !activeUser) return;
        
        const w1 = availableWitnesses.find(w => w.id === selectedW1);
        const w2 = availableWitnesses.find(w => w.id === selectedW2);

        if (!w1 || !w2) {
            showToast("Selecione duas testemunhas da sua base habitual.", "warning");
            return;
        }

        setIsGenerating(true);
        try {
            const params: LegalDocumentParams = {
                loanId: selectedLoan.id,
                creditorName: creditorName.toUpperCase(),
                creditorDoc: creditorDoc,
                creditorAddress: creditorFullAddress,
                debtorName: selectedLoan.debtorName.toUpperCase(),
                debtorDoc: selectedLoan.debtorDocument,
                debtorPhone: selectedLoan.debtorPhone,
                debtorAddress: selectedLoan.debtorAddress || 'Endereço não informado',
                amount: selectedLoan.principal,
                totalDebt: selectedLoan.totalToReceive,
                originDescription: `Operação de crédito privado (Mútuo) ID ${selectedLoan.id.substring(0,8)} pactuada em ${new Date(selectedLoan.startDate).toLocaleDateString('pt-BR')}.`,
                city: activeUser.city || 'Manaus',
                state: activeUser.state || 'AM',
                witnesses: [w1, w2],
                contractDate: selectedLoan.startDate,
                agreementDate: new Date().toISOString(),
                installments: selectedLoan.installments.map(i => ({
                    number: i.number || 1,
                    dueDate: i.dueDate,
                    amount: i.amount
                })),
                timestamp: new Date().toISOString()
            };

            const docRecord = await legalService.generateAndRegisterDocument(
                selectedLoan.activeAgreement?.id || selectedLoan.id, 
                params, 
                activeUser.id
            );

            const html = DocumentTemplates.confissaoDivida(params);
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
                showToast("Documento registrado e aberto para impressão!", "success");
                setTimeout(() => win.print(), 800);
            }
        } catch (e: any) {
            console.error(e);
            showToast("Falha na base de dados: " + e.message, "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const copySigningLink = async () => {
        if (!selectedLoan || !activeUser) return;
        try {
            const { doc } = await legalService.getFullAuditData(selectedLoan.id); 
            showToast("Gerando link seguro...", "info");
            
            const token = doc?.public_access_token;
            const url = token 
                ? `${window.location.origin}/?legal_sign=${token}`
                : `${window.location.origin}/?portal=${selectedLoan.id}&legal_sign=true`;

            navigator.clipboard.writeText(url);
            showToast("Link do Portal (Jurídico) copiado!", "success");
        } catch (e) {
            showToast("Erro ao gerar link.", "error");
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase flex items-center gap-2">
                            <Scroll className="text-indigo-500" size={24}/> Emissão de Títulos
                        </h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Credor: {creditorName}</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowManager(!showManager)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border ${showManager ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                >
                    <Users size={14}/> {showManager ? 'Voltar para Emissão' : 'Gerenciar Testemunhas'}
                </button>
            </div>

            {showManager ? (
                <WitnessBaseManager profileId={activeUser?.id || ''} />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] space-y-4">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2">
                            <UserCheck size={16} className="text-blue-500"/> 1. Escolher Contrato Ativo
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                            {loans.filter(l => !l.isArchived).map(loan => (
                                <button 
                                    key={loan.id} 
                                    onClick={() => setSelectedLoan(loan)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedLoan?.id === loan.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                                >
                                    <div className="text-left">
                                        <p className="font-bold text-sm uppercase">{loan.debtorName}</p>
                                        <p className="text-[10px] opacity-70">Documento: {loan.debtorDocument}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black">{formatMoney(loan.totalToReceive)}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] space-y-6">
                        <div className="bg-slate-950 p-4 rounded-xl border border-indigo-900/30">
                            <div className="flex items-center gap-2 text-indigo-400 mb-4">
                                <Users size={16}/>
                                <span className="text-[10px] font-black uppercase">Testemunhas para o Título</span>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Testemunha 01</label>
                                    <select 
                                        value={selectedW1} 
                                        onChange={e => setSelectedW1(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Selecione...</option>
                                        {availableWitnesses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Testemunha 02</label>
                                    <select 
                                        value={selectedW2} 
                                        onChange={e => setSelectedW2(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Selecione...</option>
                                        {availableWitnesses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                onClick={handleGenerateAndSave}
                                disabled={!selectedLoan || isGenerating || !selectedW1 || !selectedW2}
                                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <><FileSignature size={20}/> Registrar Confissão de Dívida</>}
                            </button>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={copySigningLink}
                                    disabled={!selectedLoan}
                                    className="flex-1 py-4 bg-slate-800 text-blue-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <LinkIcon size={16}/> Link p/ Assinatura
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
                            <Scale size={20} className="text-blue-500 shrink-0 mt-0.5"/>
                            <p className="text-[9px] text-blue-200 leading-relaxed font-bold uppercase tracking-wider">
                                Este processo gera um Hash SHA-256 e registra as testemunhas selecionadas como prova de autoria e integridade do título.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
