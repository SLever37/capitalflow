
import React from 'react';
import { formatMoney } from '../../../utils/formatters';
import { getInstallmentStatus } from '../utils/getInstallmentStatus';

interface PortalInstallmentItemProps {
    installment: any;
}

export const PortalInstallmentItem: React.FC<PortalInstallmentItemProps> = ({ installment }) => {
    const { label, statusColor, dateColor, bgIcon } = getInstallmentStatus(installment);

    return (
        <div className="flex justify-between items-center p-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${bgIcon}`}>
                    {installment.numero_parcela}
                </div>
                <div>
                    <p className={`text-[10px] font-bold uppercase ${dateColor}`}>
                        {new Date(installment.data_vencimento).toLocaleDateString()}
                    </p>
                    <p className={`text-[9px] font-bold uppercase ${statusColor}`}>
                        {label}
                    </p>
                </div>
            </div>
            <span className={`text-xs font-black ${installment.status === 'PAID' ? 'text-emerald-500 decoration-slate-500' : 'text-white'}`}>
                {formatMoney(installment.valor_parcela)}
            </span>
        </div>
    );
};
