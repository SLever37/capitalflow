
import React, { useState, useMemo } from 'react';
import { PiggyBank, ArrowUpRight, ArrowDownCircle, Filter, Calendar, TrendingUp, TrendingDown, DollarSign, Printer } from 'lucide-react';
import { Loan, LedgerEntry } from '../../types';
import { Modal } from '../ui/Modal';
import { openDreReportPrint } from '../../utils/printHelpers';

export const FlowModal = ({ onClose, loans, profit }: { onClose: () => void, loans: Loan[], profit: number }) => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    // 1. Enriquecer transações com o nome do cliente (flatmap)
    const allTrans = useMemo(() => {
        return loans.flatMap(l => 
            (l.ledger || []).map(t => ({
                ...t,
                clientName: l.debtorName || 'Cliente'
            }))
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [loans]);

    // 2. Filtrar baseado no Mês/Ano selecionado
    const filteredTrans = useMemo(() => {
        return allTrans.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
    }, [allTrans, selectedMonth, selectedYear]);

    // 3. Cálculos DRE (Demonstrativo do Resultado)
    const dre = useMemo(() => {
        let grossRevenue = 0; // Juros + Multas (Receita Real)
        let principalRecovered = 0; // Principal retornado (Não é receita, é fluxo de caixa)
        let investment = 0; // Novos Empréstimos (Saída de Caixa)
        let operationalLoss = 0; // Estornos ou Perdas (Se houver lógica de perda no futuro)

        filteredTrans.forEach(t => {
            if (t.type === 'LEND_MORE') {
                investment += t.amount;
            } else if (t.type.includes('PAYMENT')) {
                // Se temos os deltas detalhados (nova versão do DB)
                if (t.interestDelta !== undefined) {
                    grossRevenue += (t.interestDelta + (t.lateFeeDelta || 0));
                    principalRecovered += (t.principalDelta || 0);
                } else {
                    // Fallback para dados antigos (Assume tudo como receita se não tiver delta explícito, ou estimativa)
                    // Melhor assumir total como entrada bruta se não distinguir
                    grossRevenue += t.amount; 
                }
            } else if (t.type === 'REFUND_SOURCE_CHANGE') {
                // Estorno técnico
            }
        });

        const netResult = grossRevenue; // Lucro Líquido do período (Considerando que Principal não é Receita e Investimento é Ativo)
        const cashFlow = (grossRevenue + principalRecovered) - investment; // Fluxo de Caixa Líquido

        return { grossRevenue, principalRecovered, investment, netResult, cashFlow };
    }, [filteredTrans]);

    const handleMonthChange = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
            else setSelectedMonth(m => m - 1);
        } else {
            if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
            else setSelectedMonth(m => m + 1);
        }
    };

    const handlePrintReport = () => {
        const periodName = new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        openDreReportPrint({
            period: periodName,
            businessName: 'Meu Negócio', // Poderia pegar do UserProfile se disponível
            dre,
            transactions: filteredTrans
        });
    };

    return (
        <Modal onClose={onClose} title="DRE - Resultado Financeiro">
            <div className="space-y-6">
                
                {/* Seletor de Período */}
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-2xl border border-slate-800">
                    <button onClick={() => handleMonthChange('prev')} className="p-3 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"><ArrowDownCircle className="rotate-90" size={20}/></button>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Período</p>
                        <p className="text-lg font-black text-white uppercase">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <button onClick={() => handleMonthChange('next')} className="p-3 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"><ArrowUpRight className="rotate-45" size={20}/></button>
                </div>

                {/* Cards DRE */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-500"><TrendingUp size={14}/></div>
                            <p className="text-[9px] font-black uppercase text-emerald-500">Receita Bruta (Juros)</p>
                        </div>
                        <p className="text-xl font-black text-white">R$ {dre.grossRevenue.toFixed(2)}</p>
                    </div>

                    <div className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-500"><PiggyBank size={14}/></div>
                            <p className="text-[9px] font-black uppercase text-blue-500">Recuperação Principal</p>
                        </div>
                        <p className="text-xl font-black text-white">R$ {dre.principalRecovered.toFixed(2)}</p>
                    </div>

                    <div className="bg-rose-950/20 border border-rose-500/20 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-500"><TrendingDown size={14}/></div>
                            <p className="text-[9px] font-black uppercase text-rose-500">Novos Aportes</p>
                        </div>
                        <p className="text-xl font-black text-white">R$ {dre.investment.toFixed(2)}</p>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-slate-700 rounded-lg text-white"><DollarSign size={14}/></div>
                                <p className="text-[9px] font-black uppercase text-slate-400">Caixa Líquido (Mês)</p>
                            </div>
                            <p className={`text-xl font-black ${dre.cashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {dre.cashFlow > 0 ? '+' : ''}R$ {dre.cashFlow.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lista Detalhada */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[350px]">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Detalhamento das Operações</p>
                        <button onClick={handlePrintReport} className="text-[9px] font-bold uppercase bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-600 transition-colors">
                            <Printer size={12}/> Imprimir Relatório
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredTrans.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                                <Filter size={40} className="mb-2"/>
                                <p className="text-xs font-bold uppercase">Sem movimentos no período</p>
                             </div>
                        ) : (
                            filteredTrans.map((t, i) => (
                                <div key={i} className="flex justify-between items-center p-3 border-b border-slate-800 last:border-0 hover:bg-slate-900 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1 h-8 rounded-full ${t.type === 'LEND_MORE' ? 'bg-rose-500' : t.category === 'RECEITA' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase">{t.clientName}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                <span>{new Date(t.date).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                <span className={`${t.type === 'LEND_MORE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    {t.category || (t.type === 'LEND_MORE' ? 'INVESTIMENTO' : 'RECEITA')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-black ${t.type === 'LEND_MORE' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {t.type === 'LEND_MORE' ? '-' : '+'} R$ {t.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
