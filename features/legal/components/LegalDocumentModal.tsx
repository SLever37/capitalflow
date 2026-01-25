
import React, { useRef, useState, useEffect } from 'react';
import { Modal } from "../../../components/ui/Modal";
import { Agreement, Loan, UserProfile, LegalDocumentRecord } from "../../../types";
import { generateConfissaoDividaHTML } from "../templates/ConfissaoDividaTemplate";
import { legalService } from "../services/legalService";
import { Printer, Scale, FileSignature, Lock, Loader2, ShieldCheck, AlertOctagon } from "lucide-react";

interface LegalDocumentModalProps {
    agreement: Agreement;
    loan: Loan;
    activeUser: UserProfile;
    onClose: () => void;
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({ agreement, loan, activeUser, onClose }) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSigning, setIsSigning] = useState(false);
    const [docRecord, setDocRecord] = useState<LegalDocumentRecord | null>(null);
    const [integrityStatus, setIntegrityStatus] = useState<'VERIFYING' | 'VALID' | 'CORRUPTED' | null>(null);

    useEffect(() => {
        const initDocument = async () => {
            setIsLoading(true);
            try {
                // 1. Prepara dados e gera/recupera documento
                const params = legalService.prepareDocumentParams(agreement, loan, activeUser);
                const record = await legalService.generateAndRegisterDocument(agreement.id, params, activeUser.id);
                setDocRecord(record);

                // 2. Valida integridade imediatamente
                const isValid = await legalService.verifyIntegrity(record);
                setIntegrityStatus(isValid ? 'VALID' : 'CORRUPTED');

                // 3. Renderiza
                const html = generateConfissaoDividaHTML(params, record.id, record.hashSHA256);
                setHtmlContent(html);
            } catch (e) {
                console.error("Erro ao gerar documento jurídico", e);
                const params = legalService.prepareDocumentParams(agreement, loan, activeUser);
                setHtmlContent(generateConfissaoDividaHTML(params, "OFFLINE-DEMO", "OFFLINE-HASH-SIMULADO"));
            } finally {
                setIsLoading(false);
            }
        };

        initDocument();
    }, [agreement, loan, activeUser]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    const handleSign = async () => {
        if (!docRecord) return;
        if (!window.confirm("DECLARAÇÃO LEGAL:\n\nAo confirmar, você aplica uma ASSINATURA ELETRÔNICA neste documento com validade jurídica (MP 2.200-2/2001).\n\nSeu IP e dados de conexão serão registrados permanentemente.\n\nConfirmar assinatura?")) return;
        
        setIsSigning(true);
        try {
            await legalService.signDocument(docRecord.id, activeUser.id, {
                name: activeUser.name,
                doc: activeUser.document || 'CPF não informado'
            });
            setDocRecord(prev => prev ? { ...prev, status: 'SIGNED' } : null);
            alert("Documento assinado eletronicamente com sucesso! O Hash e os Metadados foram registrados.");
        } catch (e: any) {
            alert("ERRO NA ASSINATURA: " + e.message);
        } finally {
            setIsSigning(false);
        }
    };

    const isSigned = docRecord?.status === 'SIGNED';

    return (
        <Modal onClose={onClose} title="Documentação Jurídica">
            <div className="flex flex-col h-[80vh]">
                <div className={`flex items-center justify-between mb-4 p-4 rounded-2xl border ${integrityStatus === 'CORRUPTED' ? 'bg-rose-950 border-rose-500' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${isSigned ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                            {isSigned ? <ShieldCheck size={24}/> : <Scale size={24} />}
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">
                                {isSigned ? 'Título Executivo Assinado' : 'Minuta de Confissão de Dívida'}
                            </h3>
                            <div className="flex items-center gap-2">
                                <p className="text-slate-400 text-xs">Art. 784, III, CPC</p>
                                {integrityStatus === 'VALID' && <span className="text-[10px] text-emerald-500 bg-emerald-950/30 px-1.5 rounded flex items-center gap-1"><Lock size={8}/> Hash Válido</span>}
                                {integrityStatus === 'CORRUPTED' && <span className="text-[10px] text-rose-500 bg-rose-950/30 px-1.5 rounded flex items-center gap-1"><AlertOctagon size={8}/> VIOLAÇÃO DE INTEGRIDADE</span>}
                            </div>
                        </div>
                    </div>
                    {docRecord && (
                        <div className="hidden sm:block text-right">
                            <p className="text-[10px] text-slate-500 font-mono uppercase">ID: {docRecord.id.split('-')[0]}</p>
                            {isSigned && <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">IMUTÁVEL</p>}
                        </div>
                    )}
                </div>

                <div className="flex-1 bg-white rounded-xl border-4 border-slate-800 overflow-hidden relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-2" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gerando Snapshot Jurídico...</p>
                        </div>
                    ) : (
                        <>
                            {isSigned && (
                                <div className="absolute top-4 right-4 z-20 opacity-80 pointer-events-none">
                                    <div className="border-4 border-emerald-600 text-emerald-600 rounded-lg p-2 font-black uppercase text-xl transform -rotate-12 bg-white/90">
                                        ASSINADO DIGITALMENTE
                                    </div>
                                </div>
                            )}
                            <iframe 
                                srcDoc={htmlContent}
                                className="w-full h-full"
                                title="Legal Document Preview"
                            />
                        </>
                    )}
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase text-xs">
                        Fechar
                    </button>
                    
                    {!isSigned && (
                        <button 
                            onClick={handleSign} 
                            disabled={isSigning || integrityStatus !== 'VALID'}
                            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSigning ? <Loader2 className="animate-spin" size={18}/> : <><FileSignature size={18}/> Assinar Eletronicamente</>}
                        </button>
                    )}

                    <button onClick={handlePrint} disabled={isLoading} className="flex-1 py-4 bg-slate-700 text-white rounded-2xl font-black uppercase text-xs hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        <Printer size={18}/> PDF
                    </button>
                </div>
                
                <div className="mt-4 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                        <Lock size={10}/> Rastreabilidade Garantida (Hash SHA-256)
                    </p>
                </div>
            </div>
        </Modal>
    );
};
