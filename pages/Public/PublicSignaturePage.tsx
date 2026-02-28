
import React, { useEffect, useState, useCallback } from 'react';
import { FileSignature, ShieldCheck, CheckCircle2, Loader2, Download, AlertTriangle, PenTool, User, Users, Scale } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { legalService } from '../../features/legal/services/legalService';
import { formatMoney } from '../../utils/formatters';
import { DocumentTemplates } from '../../features/legal/templates/DocumentTemplates';

export const PublicSignaturePage = () => {
    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [document, setDocument] = useState<any>(null);
    const [signatures, setSignatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [signedSuccess, setSignedSuccess] = useState(false);

    const loadData = useCallback(async (tokenStr: string) => {
        try {
            // 1. Validar Token e buscar documento
            const { data: doc, error: docError } = await supabase
                .from('documentos_juridicos')
                .select('*')
                .eq('view_token', tokenStr)
                .single();

            if (docError || !doc) {
                setError('Link de assinatura inválido ou expirado.');
                setLoading(false);
                return;
            }

            setDocument(doc);

            // 2. Buscar assinaturas já realizadas
            const { data: sigs } = await supabase
                .from('assinaturas_documento')
                .select('*')
                .eq('document_id', doc.id);
            
            setSignatures(sigs || []);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setError('Erro ao carregar documento.');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('legal_sign');
        const r = params.get('role');
        setToken(t);
        setRole(r);
        if (t) loadData(t);
        else {
            setError('Token de acesso não fornecido.');
            setLoading(false);
        }
    }, [loadData]);

    const handleSign = async () => {
        if (!document || !role || !token) return;
        setIsSigning(true);
        try {
            // Determinar nome e documento baseado na role e no snapshot
            const snapshot = document.snapshot;
            let signerName = '';
            let signerDoc = '';

            if (role === 'DEBTOR') {
                signerName = snapshot.debtorName;
                signerDoc = snapshot.debtorDoc;
            } else if (role === 'CREDITOR') {
                signerName = snapshot.creditorName;
                signerDoc = snapshot.creditorDoc;
            } else if (role === 'WITNESS_1') {
                signerName = snapshot.witnesses[0]?.name || '';
                signerDoc = snapshot.witnesses[0]?.document || '';
            } else if (role === 'WITNESS_2') {
                signerName = snapshot.witnesses[1]?.name || '';
                signerDoc = snapshot.witnesses[1]?.document || '';
            }

            await legalService.signDocument(document.id, 'PUBLIC_USER', { name: signerName, doc: signerDoc }, role);
            
            setSignedSuccess(true);
            loadData(token); // Recarregar para atualizar lista de assinaturas
        } catch (e: any) {
            alert('Erro ao assinar: ' + e.message);
        } finally {
            setIsSigning(false);
        }
    };

    const handleDownload = () => {
        if (signatures.length < 4) return;
        const html = DocumentTemplates.confissaoDivida(document.snapshot);
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            setTimeout(() => win.print(), 500);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-4">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Validando Token...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center">
                <AlertTriangle size={48} className="mx-auto text-rose-500 mb-4" />
                <h2 className="text-white font-black text-xl mb-2">Acesso Negado</h2>
                <p className="text-slate-400 text-sm">{error}</p>
            </div>
        </div>
    );

    const isAlreadySigned = signatures.some(s => s.role === role);
    const totalSignatures = signatures.length;
    const isComplete = totalSignatures >= 4;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 flex justify-center">
            <div className="w-full max-w-2xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
                            <FileSignature size={28} />
                        </div>
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-tight">Assinatura Digital</h1>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Protocolo: {document.id.substring(0,8).toUpperCase()}</p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${isComplete ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-amber-500/10 border-amber-500/50 text-amber-500'}`}>
                            {isComplete ? 'Documento Finalizado' : `${totalSignatures}/4 Assinaturas`}
                        </span>
                    </div>
                </div>

                {/* Document Preview Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Scale size={18} className="text-indigo-500"/> Confissão de Dívida
                        </h2>
                        <span className="text-[10px] font-mono text-slate-500">Hash: {document.hash_sha256?.substring(0,16)}...</span>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] text-slate-500 font-black uppercase">Devedor</p>
                                <p className="text-sm font-bold text-white">{document.snapshot.debtorName}</p>
                                <p className="text-xs text-slate-400">{document.snapshot.debtorDoc}</p>
                            </div>
                            <div className="space-y-1 text-left sm:text-right">
                                <p className="text-[10px] text-slate-500 font-black uppercase">Valor Confessado</p>
                                <p className="text-xl font-black text-white">{formatMoney(document.snapshot.totalDebt)}</p>
                            </div>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                            <p className="text-[10px] text-slate-500 font-black uppercase mb-2">Objeto do Título</p>
                            <p className="text-xs text-slate-300 leading-relaxed italic">
                                "{document.snapshot.originDescription}"
                            </p>
                        </div>

                        {/* Signatures Status */}
                        <div className="space-y-3">
                            <p className="text-[10px] text-slate-500 font-black uppercase">Quadro de Assinaturas</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {['CREDITOR', 'DEBTOR', 'WITNESS_1', 'WITNESS_2'].map(r => {
                                    const sig = signatures.find(s => s.role === r);
                                    const label = r === 'CREDITOR' ? 'Credor' : r === 'DEBTOR' ? 'Devedor' : r === 'WITNESS_1' ? 'Testemunha 1' : 'Testemunha 2';
                                    return (
                                        <div key={r} className={`p-3 rounded-xl border flex items-center justify-between ${sig ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-950 border-slate-800'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sig ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                    {sig ? <CheckCircle2 size={16}/> : <PenTool size={16}/>}
                                                </div>
                                                <span className={`text-xs font-bold ${sig ? 'text-white' : 'text-slate-500'}`}>{label}</span>
                                            </div>
                                            {sig && <span className="text-[9px] font-mono text-emerald-500/70">{new Date(sig.signed_at).toLocaleDateString()}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex flex-col sm:flex-row gap-4">
                        {!isAlreadySigned && !isComplete ? (
                            <button 
                                onClick={handleSign}
                                disabled={isSigning}
                                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSigning ? <Loader2 className="animate-spin" size={20}/> : <PenTool size={20}/>}
                                Assinar Documento Agora
                            </button>
                        ) : isAlreadySigned && !isComplete ? (
                            <div className="flex-1 py-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                                <CheckCircle2 size={20}/> Você já assinou este documento
                            </div>
                        ) : null}

                        <button 
                            onClick={handleDownload}
                            disabled={!isComplete}
                            className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${isComplete ? 'bg-white text-slate-950 hover:bg-slate-200 shadow-xl' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                        >
                            <Download size={20}/> {isComplete ? 'Baixar PDF Final' : 'Aguardando Assinaturas'}
                        </button>
                    </div>
                </div>

                {/* Security Footer */}
                <div className="flex items-center justify-center gap-6 text-slate-600">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={14}/>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Criptografia SHA-256</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users size={14}/>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Validade Jurídica</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
