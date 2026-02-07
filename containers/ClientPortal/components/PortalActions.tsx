
import React from 'react';
import { DollarSign, FileSignature, Upload } from 'lucide-react';

interface PortalActionsProps {
    onAutoPayment: () => void;
    onManualPayment: () => void;
    onLegal: () => void;
    disablePayment: boolean;
}

export const PortalActions: React.FC<PortalActionsProps> = ({ onAutoPayment, onManualPayment, onLegal, disablePayment }) => {
    return (
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={onAutoPayment} 
                disabled={disablePayment}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 group col-span-2"
            >
                <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><DollarSign size={20}/></div>
                <span className="text-[10px] font-black uppercase">Pagar Agora (PIX Automático)</span>
            </button>

            <button 
                onClick={onManualPayment} 
                disabled={disablePayment}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group"
            >
                <div className="p-2 bg-slate-700 rounded-full group-hover:scale-110 transition-transform text-blue-400"><Upload size={20}/></div>
                <span className="text-[10px] font-black uppercase text-center">Enviar Comprovante</span>
            </button>

            <button 
                onClick={onLegal}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 active:scale-95 group"
            >
                <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><FileSignature size={20}/></div>
                <span className="text-[10px] font-black uppercase">Contratos</span>
            </button>
        </div>
    );
};
