
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Wallet, CreditCard, TrendingUp, TrendingDown, LayoutGrid, ArrowRightLeft, ShoppingBag, Settings2, Calendar, Banknote, Coins } from 'lucide-react';
import { UserProfile } from '../types';
import { personalFinanceService } from '../features/personal-finance/services/personalFinanceService';
import { PFTransaction, PFAccount, PFCard, PFCategory } from '../features/personal-finance/types';
import { PersonalFinanceAI } from '../features/personal-finance/components/PersonalFinanceAI';
import { ManageAssetsModal } from '../features/personal-finance/components/ManageAssetsModal';
import { formatMoney } from '../utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Modal } from '../components/ui/Modal';

interface Props {
    activeUser: UserProfile;
}

export const PersonalFinancesPage: React.FC<Props> = ({ activeUser }) => {
    const [transactions, setTransactions] = useState<PFTransaction[]>([]);
    const [accounts, setAccounts] = useState<PFAccount[]>([]);
    const [cards, setCards] = useState<PFCard[]>([]);
    const [categories, setCategories] = useState<PFCategory[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());

    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [suggestion, setSuggestion] = useState<string | null>(null);
    
    const [newTx, setNewTx] = useState({ 
        descricao: '', 
        valor: '', 
        tipo: 'DESPESA' as any, 
        conta_id: '', 
        cartao_id: '', 
        categoria_id: '', 
        data: new Date().toISOString().split('T')[0],
        fixo: false 
    });

    // Lógica de Sugestão Inteligente (Matching Names)
    useEffect(() => {
        if (newTx.tipo === 'DESPESA' && newTx.descricao) {
            const matchCard = cards.find(c => newTx.descricao.toLowerCase().includes(c.nome.toLowerCase()));
            if (matchCard) {
                setSuggestion(`Detectamos "${matchCard.nome}". Registrar como pagamento de fatura?`);
            } else {
                setSuggestion(null);
            }
        } else {
            setSuggestion(null);
        }
    }, [newTx.descricao, newTx.tipo, cards]);

    const applySuggestion = () => {
        const matchCard = cards.find(c => newTx.descricao.toLowerCase().includes(c.nome.toLowerCase()));
        if (matchCard) {
            setNewTx(prev => ({
                ...prev,
                tipo: 'TRANSFERENCIA',
                cartao_id: matchCard.id,
                // Mantém a conta origem se já estiver selecionada, ou deixa vazio
            }));
            setSuggestion(null);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [accs, crds, txs, cats] = await Promise.all([
                personalFinanceService.getAccounts(activeUser.id),
                personalFinanceService.getCards(activeUser.id),
                personalFinanceService.getTransactions(activeUser.id, month, year),
                personalFinanceService.getCategories(activeUser.id)
            ]);
            setAccounts(accs);
            setCards(crds);
            setTransactions(txs);
            setCategories(cats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [activeUser.id, month, year]);

    const handleSaveTx = async () => {
        if (!newTx.descricao || !newTx.valor || !newTx.data) return;
        if (newTx.tipo !== 'TRANSFERENCIA' && !newTx.conta_id && !newTx.cartao_id) {
            alert("Selecione uma conta ou cartão para registrar o fluxo.");
            return;
        }

        try {
            await personalFinanceService.addTransaction({
                ...newTx,
                valor: parseFloat(newTx.valor.replace(',', '.')),
                status: 'CONSOLIDADO'
            }, activeUser.id);
            setIsTxModalOpen(false);
            setNewTx({ 
                descricao: '', 
                valor: '', 
                tipo: 'DESPESA', 
                conta_id: '', 
                cartao_id: '', 
                categoria_id: '', 
                data: new Date().toISOString().split('T')[0],
                fixo: false 
            });
            loadData();
        } catch (e) {
            alert("Erro ao salvar transação");
        }
    };

    const stats = useMemo(() => {
        const income = transactions.filter(t => t.tipo === 'RECEITA').reduce((acc, t) => acc + t.valor, 0);
        const expense = transactions.filter(t => t.tipo === 'DESPESA').reduce((acc, t) => acc + t.valor, 0);
        const balance = income - expense;
        
        const catMap: any = {};
        transactions.filter(t => t.tipo === 'DESPESA').forEach(t => {
            const cat = t.category_name || 'Outros';
            catMap[cat] = (catMap[cat] || 0) + t.valor;
        });
        const pieData = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }));

        return { income, expense, balance, pieData };
    }, [transactions]);

    const COLORS = ['#ec4899', '#8b5cf6', '#6366f1', '#3b82f6', '#10b981', '#f59e0b'];

    return (
        <div className="space-y-8 animate-in fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
                        <Wallet className="text-pink-500" size={28}/> Minhas Finanças
                    </h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gestão Pessoal Integrada</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button onClick={() => setMonth(m => m === 0 ? 11 : m - 1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowRightLeft className="rotate-180" size={16}/></button>
                    <span className="text-xs font-black text-white w-40 text-center uppercase">
                        {new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => setMonth(m => m === 11 ? 0 : m + 1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowRightLeft size={16}/></button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingUp className="text-emerald-500" size={14}/> Receitas</p>
                    <p className="text-2xl font-black text-white">{formatMoney(stats.income)}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingDown className="text-rose-500" size={14}/> Despesas</p>
                    <p className="text-2xl font-black text-rose-500">{formatMoney(stats.expense)}</p>
                </div>
                <div className="bg-pink-900/10 border border-pink-500/20 p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={64} className="text-pink-500"/></div>
                    <p className="text-[10px] text-pink-300 font-black uppercase tracking-widest mb-2">Balanço do Mês</p>
                    <p className={`text-2xl font-black ${stats.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(stats.balance)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2"><CreditCard size={14}/> Contas & Cartões</h3>
                            <button onClick={() => setIsManageModalOpen(true)} className="text-[10px] text-blue-500 font-bold uppercase hover:text-blue-400 flex items-center gap-1">
                                <Settings2 size={12}/> Gerenciar
                            </button>
                        </div>
                        <div className="space-y-3">
                            {accounts.map(acc => (
                                <div key={acc.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><Wallet size={14}/></div>
                                        <div>
                                            <p className="text-xs font-bold text-white">{acc.nome}</p>
                                            <p className="text-[9px] text-slate-500 uppercase">{acc.tipo}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-black text-emerald-400">{formatMoney(acc.saldo)}</p>
                                </div>
                            ))}
                            {cards.map(card => (
                                <div key={card.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><CreditCard size={14}/></div>
                                        <div>
                                            <p className="text-xs font-bold text-white">{card.nome}</p>
                                            <p className="text-[9px] text-slate-500 uppercase">Fecha dia {card.dia_fechamento}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-black text-white">Lim: {formatMoney(card.limite)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                         <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><ShoppingBag size={14}/> Gastos por Categoria</h3>
                         <div style={{ width: '100%', minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={stats.pieData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                        {stats.pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '10px' }} itemStyle={{ color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                         </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] min-h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={16}/> Movimentações</h3>
                            <button onClick={() => setIsTxModalOpen(true)} className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-pink-900/20 transition-all">
                                <Plus size={14}/> Lançar Fluxo
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {transactions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                    <LayoutGrid size={48} className="mb-4"/>
                                    <p className="text-xs font-bold uppercase">Sem registros para o período.</p>
                                </div>
                            ) : (
                                transactions.map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-pink-500/30 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${tx.tipo === 'RECEITA' ? 'bg-emerald-500' : tx.tipo === 'DESPESA' ? 'bg-rose-500' : 'bg-blue-500'}`}>
                                                {tx.tipo === 'RECEITA' ? <TrendingUp size={18}/> : tx.tipo === 'DESPESA' ? <TrendingDown size={18}/> : <ArrowRightLeft size={18}/>}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{tx.descricao}</p>
                                                <div className="flex gap-2 text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                                                    <span>{new Date(tx.data).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span className="text-slate-400">{tx.category_name || 'Geral'}</span>
                                                    <span>•</span>
                                                    <span className="text-slate-400">{tx.account_name || tx.card_name || 'Externo'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-black ${tx.tipo === 'RECEITA' ? 'text-emerald-400' : tx.tipo === 'DESPESA' ? 'text-rose-400' : 'text-white'}`}>
                                            {tx.tipo === 'DESPESA' ? '-' : '+'} {formatMoney(tx.valor)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <PersonalFinanceAI 
                transactions={transactions} 
                accounts={accounts} 
                cards={cards} 
                profileId={activeUser.id} 
                onRefresh={loadData} 
            />

            {/* Modal de Lançamento Rigoroso */}
            {isTxModalOpen && (
                <Modal onClose={() => setIsTxModalOpen(false)} title="Novo Lançamento Contábil">
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                            {['DESPESA', 'RECEITA', 'TRANSFERENCIA'].map(t => (
                                <button key={t} onClick={() => setNewTx({...newTx, tipo: t, categoria_id: ''})} className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${newTx.tipo === t ? 'bg-pink-600 text-white' : 'text-slate-500 hover:text-white'}`}>{t}</button>
                            ))}
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Descrição do Lançamento</label>
                            <input type="text" placeholder="Ex: Salário Mensal, Renda Fixa..." className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white text-xs outline-none focus:border-pink-500" value={newTx.descricao} onChange={e => setNewTx({...newTx, descricao: e.target.value})} />
                            
                            {/* SUGESTÃO INTELIGENTE */}
                            {suggestion && (
                                <button onClick={applySuggestion} className="w-full p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold text-blue-300 hover:bg-blue-600/30 transition-colors animate-in fade-in slide-in-from-top-2 mt-1">
                                    <ArrowRightLeft size={12}/> {suggestion}
                                </button>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Valor</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">R$</span>
                                    <input type="text" placeholder="0,00" className="w-full bg-slate-950 p-3 pl-8 rounded-xl border border-slate-800 text-white text-lg font-black outline-none focus:border-emerald-500" value={newTx.valor} onChange={e => setNewTx({...newTx, valor: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-1"><Calendar size={10}/> Data de Entrada</label>
                                <input type="date" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white text-xs outline-none focus:border-blue-500" value={newTx.data} onChange={e => setNewTx({...newTx, data: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-4 pt-2 border-t border-slate-800">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Fonte / Categoria de Renda</label>
                                <select 
                                    className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white text-xs outline-none focus:border-pink-500" 
                                    value={newTx.categoria_id} 
                                    onChange={e => setNewTx({...newTx, categoria_id: e.target.value})}
                                >
                                    <option value="">-- Selecionar --</option>
                                    {categories.filter(c => c.tipo === newTx.tipo).map(c => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                    {/* Categorias fixas sugeridas se não houver no banco */}
                                    {newTx.tipo === 'RECEITA' && (
                                        <>
                                            <option value="sys_salario">Salário Fixo</option>
                                            <option value="sys_variante">Renda Variável / Freelance</option>
                                            <option value="sys_dividendos">Dividendos / Juros</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Conta Destino (Onde o dinheiro entrou?)</label>
                                <select className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white text-xs outline-none focus:border-pink-500" value={newTx.conta_id} onChange={e => setNewTx({...newTx, conta_id: e.target.value, cartao_id: ''})}>
                                    <option value="">-- Escolher Conta --</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.nome} (Saldo: {formatMoney(a.saldo)})</option>)}
                                </select>
                            </div>
                        </div>

                        <button onClick={handleSaveTx} className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-black uppercase text-xs shadow-lg mt-2 transition-all">
                            Confirmar Lançamento
                        </button>
                        <p className="text-[8px] text-center text-slate-500 uppercase font-bold">A auditoria registrará esta entrada no banco de dados permanentemente.</p>
                    </div>
                </Modal>
            )}

            {isManageModalOpen && (
                <ManageAssetsModal 
                    onClose={() => setIsManageModalOpen(false)} 
                    profileId={activeUser.id} 
                    accounts={accounts} 
                    cards={cards} 
                    onRefresh={loadData} 
                />
            )}
        </div>
    );
};
