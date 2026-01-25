
import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Loan, CapitalSource } from '../../types';
import { getDaysDiff } from '../../utils/dateHelpers';

export const DashboardAlerts = ({ loans, sources }: { loans: Loan[], sources?: CapitalSource[] }) => {
    const activeLoans = loans.filter(l => !l.isArchived);
    const critical = activeLoans.filter(l => l.installments.some(i => getDaysDiff(i.dueDate) > 30 && i.status !== 'PAID')).length;
    
    // Alerta de Saldo Baixo (< R$ 100,00)
    const lowBalanceSources = (sources || []).filter(s => s.balance < 100);

    if (critical === 0 && lowBalanceSources.length === 0) return null;

    return (
        <div className="space-y-4 mb-6">
            {critical > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                    <div className="p-3 bg-rose-500 rounded-xl text-white shadow-lg shadow-rose-900/20 flex-shrink-0"><ShieldAlert size={24}/></div>
                    <div>
                        <p className="text-white font-bold text-sm uppercase">Atenção Necessária</p>
                        <p className="text-rose-400 text-xs font-medium">{critical} contratos com atraso crítico superior a 30 dias.</p>
                    </div>
                </div>
            )}

            {lowBalanceSources.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-amber-500 rounded-xl text-black shadow-lg shadow-amber-900/20 flex-shrink-0"><AlertTriangle size={24}/></div>
                    <div>
                        <p className="text-white font-bold text-sm uppercase">Saldo Baixo</p>
                        <p className="text-amber-400 text-xs font-medium">
                            {lowBalanceSources.length === 1 
                                ? `A fonte "${lowBalanceSources[0].name}" está quase zerada.` 
                                : `${lowBalanceSources.length} fontes estão com saldo crítico (< R$ 100).`}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
