
import React, { useEffect, useState } from 'react';
import { ShieldCheck, FileSignature, Lock, Loader2, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { legalPublicService } from '../services/legalPublic.service';
import { generateConfissaoDividaHTML } from '../templates/ConfissaoDividaTemplate';
import { maskDocument } from '../../../utils/formatters';

interface PublicLegalSignPageProps {
    token: string;
}

export const PublicLegalSignPage: React.FC<PublicLegalSignPageProps> = ({ token }) => {
    const [status, setStatus] = useState<'LOADING' | 'READY' | 'SIGNING' | 'SUCCESS' | 'ERROR'>('LOADING');
    const [docData, setDocData] = useState<any>(null);
    const [htmlContent, setHtmlContent] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    // Parâmetros de URL
    const [role, setRole] = useState<'DEVEDOR' | 'TESTEMUNHA'>('DEVEDOR');
    const [witnessIdx, setWitnessIdx] = useState<number>(-1);
    
    // Form State
    const [signerName, setSignerName] = useState('');
    const [signerDoc, setSignerDoc] = useState('');
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        const loadDocument = async () => {
            try {
                // 1. Processar Query Params
                const params = new URLSearchParams(window.location.search);
                const roleParam = params.get('role');
                const idxParam = params.get('idx');
                const nameParam = params.get('name');
                const docParam = params.get('doc');

                const currentRole = roleParam === 'TESTEMUNHA' ? 'TESTEMUNHA' : 'DEVEDOR';
                setRole(currentRole);
                if (idxParam) setWitnessIdx(parseInt(idxParam));

                // 2. Buscar Documento
                const doc = await legalPublicService.fetchDocumentByToken(token);
                setDocData(doc);
                
                // 3. Pré-preenchimento
                if (currentRole === 'DEVEDOR') {
                    if (doc.snapshot?.debtorName && doc.snapshot.debtorName !== 'DEVEDOR NÃO IDENTIFICADO') {
                        setSignerName(doc.snapshot.debtorName);
                    }
                    if (doc.snapshot?.debtorDoc && doc.snapshot.debtorDoc !== 'N/A') {
                        setSignerDoc(doc.snapshot.debtorDoc);
                    }
                } else if (currentRole === 'TESTEMUNHA' && idxParam) {
                    const idx = parseInt(idxParam);
                    const witness = doc.snapshot?.witnesses?.[idx];
                    if (witness) {
                        setSignerName(witness.name);
                        setSignerDoc(witness.document);
                    } else if (nameParam) {
                        setSignerName(nameParam);
                        if(docParam) setSignerDoc(docParam);
                    }
                }

                // 4. Gera visualização
                // Busca assinaturas já existentes (não temos acesso direto aqui, mas o snapshot pode ter metadata se atualizado)
                // Na versão pública simples, mostramos o doc limpo ou assinado pelo sistema
                const html = generateConfissaoDividaHTML(doc.snapshot, doc.id, doc.hash_sha256);
                setHtmlContent(html);

                if (doc.status_assinatura === 'ASSINADO' && currentRole === 'DEVEDOR') {
                    // Se o devedor principal já assinou, mostra sucesso
                    setStatus('SUCCESS');
                } else {
                    setStatus('READY');
                }
            } catch (e: any) {
                console.error(e);
                setErrorMessage(e.message || "Erro ao carregar documento.");
                setStatus('ERROR');
            }
        };
        loadDocument();
    }, [token]);

    const handleSign = async () => {
        if (!agreed) {
            alert("Você deve ler e concordar com o conteúdo do documento.");
            return;
        }
        if (!signerName.trim() || !signerDoc.trim()) {
            alert("Preencha seu nome e CPF/CNPJ para assinar.");
            return;
        }

        if (!confirm(`CONFIRMAÇÃO LEGAL:\n\nEu, ${signerName}, na qualidade de ${role}, assino eletronicamente este documento, concordando com seus termos e validade jurídica.\n\nMeus dados de conexão serão registrados.`)) return;

        setStatus('SIGNING');
        try {
            let ip = 'IP_NAO_DETECTADO';
            try { const res = await fetch('https://api.ipify.org?format=json'); const data = await res.json(); ip = data.ip; } catch (e) {}

            await legalPublicService.signDocumentPublicly(
                token,
                { name: signerName, doc: signerDoc },
                { ip, userAgent: navigator.userAgent }
            );

            setStatus('SUCCESS');
        } catch (e: any) {
            setErrorMessage(e.message);
            setStatus('ERROR');
        }
    };

    if (status === 'LOADING') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <h2 className="text-white font-black uppercase tracking-widest">Carregando Documento Seguro...</h2>
                <p className="text-slate-500 text-xs mt-2">Verificando integridade criptográfica (SHA-256)</p>
            </div>
        );
    }

    if (status === 'ERROR') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="bg-rose-950/20 border border-rose-500/30 p-8 rounded-3xl max-w-md text-center">
                    <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-rose-500 font-black uppercase text-xl mb-2">Acesso Negado ou Erro</h2>
                    <p className="text-rose-200 text-sm mb-6">{errorMessage}</p>
                    <p className="text-slate-500 text-xs">Se acredita ser um erro, contate o emissor do documento.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
            {/* COLUNA ESQUERDA: DOCUMENTO */}
            <div className="flex-1 bg-slate-100 lg:h-screen p-4 lg:p-8 overflow-y-auto relative">
                <div className="max-w-3xl mx-auto bg-white shadow-2xl min-h-[1000px] relative">
                    <iframe 
                        srcDoc={htmlContent} 
                        className="w-full h-[1000px] border-none" 
                        title="Documento Jurídico"
                        sandbox="allow-same-origin"
                    />
                </div>
            </div>

            {/* COLUNA DIREITA: PAINEL DE AÇÃO */}
            <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-l border-slate-800 p-6 flex flex-col shadow-2xl z-20">
                <div className="mb-6 pb-6 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-600/20 rounded-xl text-blue-500"><ShieldCheck size={24}/></div>
                        <div>
                            <h1 className="text-white font-black uppercase text-sm tracking-wide">Portal de Assinatura</h1>
                            <p className="text-slate-500 text-[10px] font-bold uppercase">Ambiente Seguro & Auditado</p>
                        </div>
                    </div>
                    {docData && (
                        <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Emissor:</span>
                                <span className="text-white font-bold">{docData.profile_name || 'Empresa'}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Hash SHA-256:</span>
                                <span className="text-emerald-400 font-mono text-[9px]">{docData.hash_sha256.substring(0,16)}...</span>
                            </div>
                        </div>
                    )}
                </div>

                {status === 'SUCCESS' ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={40} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase">Assinatura Confirmada!</h2>
                            <p className="text-slate-400 text-xs mt-2">Sua assinatura foi registrada com sucesso na blockchain interna de auditoria.</p>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-4">Você pode fechar esta janela.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${role === 'DEVEDOR' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                            <div className="pl-3">
                                <p className="text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                                    <User size={12}/> Assinando como
                                </p>
                                <p className={`text-lg font-black uppercase ${role === 'DEVEDOR' ? 'text-blue-400' : 'text-purple-400'}`}>
                                    {role.replace('_', ' ')} {witnessIdx >= 0 ? `#${witnessIdx + 1}` : ''}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block ml-1">Nome Completo</label>
                                <input 
                                    type="text" 
                                    value={signerName}
                                    onChange={e => setSignerName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Seu nome"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block ml-1">CPF / CNPJ</label>
                                <input 
                                    type="text" 
                                    value={signerDoc}
                                    onChange={e => setSignerDoc(maskDocument(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                                    placeholder="000.000.000-00"
                                />
                            </div>

                            <div className="pt-4 pb-2">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${agreed ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-700 group-hover:border-slate-500'}`}>
                                        {agreed && <CheckCircle2 size={14} className="text-white"/>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                                    <span className="text-xs text-slate-400 select-none leading-tight">
                                        Declaro que li o documento e aplico minha assinatura eletrônica com plena validade jurídica.
                                    </span>
                                </label>
                            </div>

                            <button 
                                onClick={handleSign}
                                disabled={status === 'SIGNING' || !agreed}
                                className={`w-full py-4 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${role === 'DEVEDOR' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'}`}
                            >
                                {status === 'SIGNING' ? <Loader2 className="animate-spin" size={16}/> : <><FileSignature size={16}/> Assinar Agora</>}
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-6 border-t border-slate-800 text-center">
                    <p className="text-[9px] text-slate-600 leading-relaxed">
                        Assinatura eletrônica válida conforme <b>MP 2.200-2/2001</b> e <b>Lei 14.063/2020</b>. Integridade garantida por hash criptográfico e registro de evidências técnicas.
                    </p>
                </div>
            </div>
        </div>
    );
};