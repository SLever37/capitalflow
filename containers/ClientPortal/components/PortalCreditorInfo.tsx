
import React from 'react';
import { Building } from 'lucide-react';

interface PortalCreditorInfoProps {
    creditor: { name: string; doc: string; address: string } | null;
}

export const PortalCreditorInfo: React.FC<PortalCreditorInfoProps> = ({ creditor }) => {
    if (!creditor) return null;

    return (
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/50 flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
            <div className="p-2 bg-slate-800 rounded-xl text-slate-400"><Building size={16}/></div>
            <div className="overflow-hidden flex-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Credor Responsável</p>
                <p className="text-[10px] text-white font-bold truncate">{creditor.name}</p>
                {creditor.doc && <p className="text-[8px] text-slate-600 truncate">{creditor.doc}</p>}
            </div>
        </div>
    );
};
