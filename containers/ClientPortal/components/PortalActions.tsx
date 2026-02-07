
import React from 'react';
import { DollarSign, FileSignature, Upload, Copy, FileText, CheckCircle2 } from 'lucide-react';

interface PortalActionsProps {
    onAutoPayment: () => void;
    onManualPayment: () => void;
    onGenericUpload: () => void;
    onLegal: () => void;
    onCopyPix: () => void;
    disablePayment: boolean;
}

export const PortalActions: React.FC<PortalActionsProps> = ({ 
    onAutoPayment, 
    onManualPayment, 
    onGenericUpload,
    onLegal, 
    onCopyPix,
    disablePayment 
}) => {
    return (
        <div className="space-y-3">
            {/* PAGAMENTO AUTOMÁTICO (DESTAQUE) */}
            <button 
                onClick={onAutoPayment} 
                disabled={disablePayment}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 group"
            >
                <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><DollarSign size={20}/></div>
                <span className="text-[10px] font-black uppercase">Pagar Agora (PIX Automático)</span>
            </button>

            {/* SEÇÃO PAGAMENTO MANUAL */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={onCopyPix} 
                    className="bg-slate-800 hover:bg-slate-700 text-blue-400 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700 hover:border-blue-500 group"
                >
                    <div className="p-2 bg-slate-900 rounded-full group-hover:scale-110 transition-transform border border-slate-700"><Copy size={18}/></div>
                    <span className="text-[9px] font-black uppercase">Copiar Chave PIX</span>
                </button>

                <button 
                    onClick={onManualPayment} 
                    disabled={disablePayment}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700 group"
                >
                    <div className="p-2 bg-slate-900 rounded-full group-hover:scale-110 transition-transform text-emerald-500 border border-slate-700"><CheckCircle2 size={18}/></div>
                    <span className="text-[9px] font-black uppercase text-center">Enviar Comprovante</span>
                </button>
            </div>

            {/* SEÇÃO DOCUMENTOS E ASSINATURAS */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={onGenericUpload}
                    className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700 group"
                >
                    <div className="p-2 bg-slate-900 rounded-full group-hover:scale-110 transition-transform text-slate-400 border border-slate-700"><Upload size={18}/></div>
                    <span className="text-[9px] font-black uppercase">Enviar Documentos</span>
                </button>

                <button 
                    onClick={onLegal}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 active:scale-95 group"
                >
                    <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><FileSignature size={18}/></div>
                    <span className="text-[9px] font-black uppercase">Assinar Contratos</span>
                </button>
            </div>
        </div>
    );
};
