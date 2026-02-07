
import React from 'react';
import { FileText } from 'lucide-react';
import { PortalInstallmentItem } from './PortalInstallmentItem';

interface PortalInstallmentsListProps {
    installments: any[];
    pendingCount: number;
}

export const PortalInstallmentsList: React.FC<PortalInstallmentsListProps> = ({ installments, pendingCount }) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-white uppercase flex items-center gap-2">
                    <FileText size={14} className="text-blue-500"/> Extrato de Parcelas
                </h3>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded-lg">
                    {pendingCount} Pendentes
                </span>
            </div>
            
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                    {installments.length === 0 ? (
                        <div className="p-8 text-center text-slate-600 text-[10px] font-bold uppercase">Nenhuma parcela encontrada.</div>
                    ) : (
                        installments.map((p, idx) => (
                            <PortalInstallmentItem key={idx} installment={p} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
