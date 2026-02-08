
import React from 'react';
import { DollarSign, FileSignature } from 'lucide-react';

interface PortalActionsProps {
    onPayment: () => void;
    onLegal: () => void;
    disablePayment: boolean;
}

export const PortalActions: React.FC<PortalActionsProps> = ({ onPayment, onLegal, disablePayment }) => {
    return (
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={onPayment} 
                disabled={disablePayment}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 group"
            >
                <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><DollarSign size={20}/></div>
                <span className="text-[10px] font-black uppercase">Pagar PIX</span>
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
