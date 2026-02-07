
import { getDaysUntilDue } from '../../../components/cards/LoanCardComposition/helpers';

export const getInstallmentStatus = (installment: any) => {
    const daysDiff = getDaysUntilDue(installment.data_vencimento);
    let label = '';
    let statusColor = 'text-slate-500';
    let dateColor = 'text-slate-300';
    let bgIcon = 'bg-slate-800 text-slate-400';

    if (installment.status === 'PAID') {
        label = 'Pago';
        statusColor = 'text-emerald-500';
        dateColor = 'text-slate-500';
        bgIcon = 'bg-emerald-500/10 text-emerald-500';
    } else {
        if (daysDiff < 0) {
            const d = Math.abs(daysDiff);
            label = `Vencido há ${d} dia${d === 1 ? '' : 's'}`;
            statusColor = 'text-rose-500';
            dateColor = 'text-rose-400';
            bgIcon = 'bg-rose-500/10 text-rose-500';
        } else if (daysDiff === 0) {
            label = 'Vence hoje';
            statusColor = 'text-amber-500 animate-pulse';
            dateColor = 'text-amber-400';
            bgIcon = 'bg-amber-500/10 text-amber-500';
        } else if (daysDiff <= 3) {
            const d = Math.abs(daysDiff);
            label = `Faltam ${d} dia${d === 1 ? '' : 's'}`;
            statusColor = 'text-amber-500';
            dateColor = 'text-amber-400';
            bgIcon = 'bg-slate-800 text-slate-400';
        } else {
            label = 'Em dia';
            statusColor = 'text-slate-500';
            dateColor = 'text-slate-300';
            bgIcon = 'bg-slate-800 text-slate-400';
        }
    }

    return { label, statusColor, dateColor, bgIcon };
};
