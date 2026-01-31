
import React from 'react';
import { Clock, Calculator, RefreshCcw, MoreHorizontal, Lock } from 'lucide-react';
import { Loan, Installment, LoanStatus, Agreement, AgreementInstallment } from '../../../types';
import { getDaysDiff, formatBRDate } from '../../../utils/dateHelpers';
import { calculateTotalDue, getInstallmentStatusLogic } from '../../../domain/finance/calculations';
import { formatMoney } from '../../../utils/formatters';

interface InstallmentGridProps {
    loan: Loan;
    orderedInstallments: Installment[];
    fixedTermStats: any;
    isPaid: boolean;
    isLate: boolean;
    isZeroBalance: boolean;
    isFullyFinalized: boolean;
    showProgress: boolean;
    strategy: any;
    isDailyFree: boolean;
    isFixedTerm: boolean;
    onPayment: (loan: Loan, inst: Installment, calculations: any) => void;
    onAgreementPayment: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void;
    isStealthMode?: boolean;
}

export const InstallmentGrid: React.FC<InstallmentGridProps> = ({
    loan, orderedInstallments, fixedTermStats, isPaid, isZeroBalance, isFullyFinalized, showProgress, strategy, isDailyFree, isFixedTerm, onPayment, isStealthMode
}) => {
    return (
        // GRID RESPONSIVA: 1 coluna no mobile, 2 no tablet (sm), 3 no desktop (lg/xl)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
            {orderedInstallments.map((inst, i) => {
                const st = getInstallmentStatusLogic(inst);
                const debt = calculateTotalDue(loan, inst);
                const daysDiff = getDaysDiff(inst.dueDate);
                const isLateInst = st === LoanStatus.LATE;

                let statusText = '';
                let statusColor = '';
                let isPrepaid = false;
                let daysPrepaid = 0;

                if (isDailyFree) {
                    const due = new Date(loan.startDate); // Assume start date base
                    const now = new Date();
                    due.setHours(0, 0, 0, 0); now.setHours(0, 0, 0, 0);
                    const diffTime = due.getTime() - now.getTime();
                    if (diffTime > 0) { isPrepaid = true; daysPrepaid = Math.floor(diffTime / (1000 * 3600 * 24)); }
                }

                const isFixedTermDone = isFixedTerm && fixedTermStats && fixedTermStats.paidDays >= fixedTermStats.totalDays;

                if (inst.status === LoanStatus.PAID || isZeroBalance) { statusText = 'CONTRATO FINALIZADO'; statusColor = 'text-emerald-500 font-black'; }
                else if (isPrepaid) { statusText = `Adiantado (${daysPrepaid} dias)`; statusColor = 'text-emerald-400 font-black'; }
                else if (isFixedTerm) { 
                    const paidUntil = fixedTermStats?.paidUntilDate; const today = new Date();
                    today.setHours(0,0,0,0);
                    if (isFixedTermDone) { statusText = 'CONTRATO FINALIZADO'; statusColor = 'text-emerald-500 font-black'; }
                    else if (paidUntil) {
                        const diffTime = paidUntil.getTime() - today.getTime();
                        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (daysLeft >= 0) { statusText = `EM DIA (Pago até ${formatBRDate(paidUntil)})`; statusColor = 'text-emerald-400 font-black'; } 
                        else { statusText = `ATRASADO (${Math.abs(daysLeft)} dias)`; statusColor = 'text-rose-500 font-black animate-pulse'; }
                    } else { statusText = 'EM ABERTO'; statusColor = 'text-blue-400'; }
                }
                else if (daysDiff === 0) { statusText = 'Vence HOJE'; statusColor = 'text-amber-400 animate-pulse'; }
                else if (daysDiff < 0) { statusText = `Faltam ${Math.abs(daysDiff)} dias`; statusColor = 'text-blue-400'; }
                else { statusText = `Atrasado há ${daysDiff} dias`; statusColor = 'text-rose-500 font-black'; }

                const realIndex = showProgress ? loan.installments.findIndex(original => original.id === inst.id) + 1 : i + 1;
                const paidUntilDate = isDailyFree ? loan.startDate : inst.dueDate;
                const isActionDisabled = inst.status === LoanStatus.PAID || isFullyFinalized;

                return (
                <div key={inst.id} className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border flex flex-col justify-between h-full ${inst.status === LoanStatus.PAID || isFixedTermDone || isZeroBalance ? 'bg-emerald-500/5 border-emerald-500/20' : isLateInst ? 'bg-rose-500/5 border-rose-500/20' : isPrepaid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-slate-800'}`}>
                    {isFixedTerm && fixedTermStats ? (
                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-2"><span className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-1"><Clock size={12}/> Contador de Dias</span><span className="text-white font-black text-xs">{fixedTermStats.paidDays} / {fixedTermStats.totalDays} Pagos</span></div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-3"><div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{width: `${fixedTermStats.progressPercent}%`}}></div></div>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center"><p className="text-[8px] text-slate-500 uppercase font-black mb-1 flex items-center justify-center gap-1"><Calculator size={10}/> Data Coberta (Pago Até)</p><p className="text-sm font-black text-emerald-400">{formatBRDate(fixedTermStats.paidUntilDate)}</p><div className="h-px w-full bg-slate-800 my-2"></div><p className="text-[9px] text-slate-400 font-medium">Valor da Diária: {formatMoney(fixedTermStats.dailyValue, isStealthMode)}</p></div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-4"><p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase">{showProgress ? `${realIndex}ª Parcela` : 'Detalhes'}</p>{inst.renewalCount && inst.renewalCount > 0 ? (<span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1" title="Vezes que os juros foram pagos (Renovações)"><RefreshCcw size={8} /> {inst.renewalCount}x</span>) : null}</div>
                            <div className="relative pl-3 border-l-2 border-slate-800 space-y-4 my-2"><div className="relative"><div className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-900"></div><p className="text-[9px] font-bold text-slate-500 uppercase leading-none">{strategy.card.dueDateLabel(inst, loan)}</p><p className={`text-xs font-black ${isPrepaid ? 'text-emerald-400' : isLateInst && !isPaid ? 'text-rose-400' : 'text-white'}`}>{formatBRDate(paidUntilDate)}</p></div></div>
                        </div>
                        </div>
                    )}
                    <p className={`text-[8px] sm:text-[9px] font-bold uppercase mt-2 mb-4 ${statusColor}`}>{statusText}</p>
                    <div className="mb-4 sm:mb-5"><div className="flex flex-col"><div className="flex items-baseline gap-2 flex-wrap"><span className="text-lg sm:text-xl font-black text-white" title="Principal Restante">{formatMoney(debt.principal, isStealthMode)}</span>{(debt.interest + debt.lateFee) > 0 && !isPrepaid && (<><span className="text-slate-500 font-bold">+</span><span className={`text-lg sm:text-xl font-black ${isLateInst && inst.status !== LoanStatus.PAID ? 'text-rose-500' : 'text-emerald-500'}`} title="Juros + Multas">{formatMoney(debt.interest + debt.lateFee, isStealthMode)}</span></>)}</div><p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">{isPrepaid ? 'Principal (Juros Pagos)' : 'Total (Principal + Encargos)'}</p></div></div>
                    {!isActionDisabled ? (<button onClick={() => onPayment(loan, inst, debt)} className="w-full py-2.5 sm:py-3 rounded-xl text-[8px] sm:text-[9px] font-black uppercase transition-all bg-blue-600 text-white shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 hover:bg-blue-500 active:scale-95"><MoreHorizontal size={14} /> Gerenciar</button>) : (<div className="w-full py-2.5 sm:py-3 rounded-xl text-[8px] sm:text-[9px] font-black uppercase transition-all bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center gap-2 cursor-not-allowed"><Lock size={12}/> {isFullyFinalized ? 'Contrato Finalizado' : 'Parcela Paga'}</div>)}
                </div>
                );
            })}
        </div>
    );
};
