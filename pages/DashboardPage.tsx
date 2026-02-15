
import React, { useMemo } from 'react';
import { BarChart3, Banknote, CheckCircle2, Briefcase, PieChart as PieIcon, TrendingUp, Users, Calendar, Percent } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Loan, CapitalSource, LedgerEntry, Agreement, AgreementInstallment, SortOption, UserProfile } from '../types';
import { LoanCard } from '../components/cards/LoanCard';
import { ClientGroupCard } from '../components/cards/ClientGroupCard';
import { StatCard } from '../components/StatCard';
import { ProfitCard } from '../components/cards/ProfitCard';
import { DashboardAlerts } from '../features/dashboard/DashboardAlerts';
import { DashboardControls } from '../components/dashboard/DashboardControls';
import { AIBalanceInsight } from '../features/dashboard/AIBalanceInsight';
import { formatMoney } from '../utils/formatters';
import { groupLoansByClient } from '../domain/dashboard/loanGrouping';

interface DashboardPageProps {
  loans: Loan[];
  sources: CapitalSource[];
  filteredLoans: Loan[];
  stats: any;
  activeUser: UserProfile | null;
  staffMembers: UserProfile[];
  selectedStaffId: string;
  onStaffChange: (id: string) => void;
  mobileDashboardTab: 'CONTRACTS' | 'BALANCE';
  setMobileDashboardTab: (val: 'CONTRACTS' | 'BALANCE') => void;
  statusFilter: 'TODOS' | 'ATRASADOS' | 'EM_DIA' | 'PAGOS' | 'ARQUIVADOS' | 'ATRASO_CRITICO';
  setStatusFilter: (val: any) => void;
  sortOption: SortOption;
  setSortOption: (val: SortOption) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedLoanId: string | null;
  setSelectedLoanId: (val: string | null) => void;
  onEdit: (loan: Loan) => void;
  onMessage: (loan: Loan) => void;
  onArchive: (loan: Loan) => void;
  onRestore: (loan: Loan) => void;
  onDelete: (loan: Loan) => void;
  onNote: (loan: Loan) => void;
  onPayment: (loan: Loan, inst: any, calcs: any) => void;
  onPortalLink: (loan: Loan) => void;
  onUploadPromissoria: (loan: Loan) => void;
  onUploadDoc: (loan: Loan) => void;
  onViewPromissoria: (url: string) => void;
  onViewDoc: (url: string) => void;
  onReviewSignal: (id: string, status: 'APROVADO' | 'NEGADO') => void;
  onOpenComprovante: (url: string) => void;
  onReverseTransaction: (transaction: LedgerEntry, loan: Loan) => void;
  setWithdrawModal: (open: boolean) => void;
  showToast: (msg: string, type?: 'error'|'success') => void;
  isStealthMode: boolean;
  onRenegotiate: (loan: Loan) => void;
  onNewAporte: (loan: Loan) => void;
  onAgreementPayment: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void;
  onRefresh: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  loans, sources, filteredLoans, stats, activeUser, staffMembers, selectedStaffId, onStaffChange,
  mobileDashboardTab, setMobileDashboardTab, statusFilter, setStatusFilter, sortOption, setSortOption, 
  searchTerm, setSearchTerm, selectedLoanId, setSelectedLoanId, onEdit, onMessage, onArchive, onRestore, 
  onDelete, onNote, onPayment, onPortalLink, onUploadPromissoria, onUploadDoc, onViewPromissoria, 
  onViewDoc, onReviewSignal, onOpenComprovante, onReverseTransaction, setWithdrawModal, showToast, 
  isStealthMode, onRenegotiate, onNewAporte, onAgreementPayment, onRefresh
}) => {
  
  // Agrupa os empréstimos filtrados por cliente, respeitando a ordenação selecionada
  const groupedLoans = useMemo(() => groupLoansByClient(filteredLoans, sortOption), [filteredLoans, sortOption]);

  // Objeto com todas as props necessárias para o LoanCard (para passar via drill-down)
  const loanCardProps = {
      sources, activeUser, selectedLoanId, setSelectedLoanId, onEdit, onMessage, onArchive,
      onRestore, onDelete, onNote, onPayment, onPortalLink, onUploadPromissoria, onUploadDoc,
      onViewPromissoria, onViewDoc, onReviewSignal, onOpenComprovante, onReverseTransaction,
      onRenegotiate, onNewAporte, onAgreementPayment, onRefresh, isStealthMode
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="md:hidden bg-slate-900 p-1 rounded-2xl border border-slate-800 flex relative">
          <button onClick={() => setMobileDashboardTab('CONTRACTS')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileDashboardTab === 'CONTRACTS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Contratos</button>
          <button onClick={() => setMobileDashboardTab('BALANCE')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileDashboardTab === 'BALANCE' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Balanço</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
          <div className={`flex-1 space-y-6 sm:space-y-8 ${mobileDashboardTab === 'BALANCE' ? 'hidden md:block' : ''}`}>
              <DashboardAlerts loans={loans} sources={sources} />
              <DashboardControls 
                statusFilter={statusFilter} setStatusFilter={setStatusFilter} 
                sortOption={sortOption} setSortOption={setSortOption} 
                searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
                showToast={showToast} 
                isMaster={activeUser?.accessLevel === 1}
                staffMembers={staffMembers}
                selectedStaffId={selectedStaffId}
                onStaffChange={onStaffChange}
              />

              {/* Lista de Contratos: Renderização Agrupada */}
              {groupedLoans.length > 0 ? (
                  <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
                      {groupedLoans.map(group => {
                          return (
                              <div key={group.clientId || group.clientName} className="break-inside-avoid mb-4">
                                  <ClientGroupCard 
                                      group={group}
                                      passThroughProps={loanCardProps}
                                      isStealthMode={isStealthMode}
                                  />
                              </div>
                          );
                      })}
                  </div>
              ) : (
                  // Empty State Otimizado
                  <div className="flex flex-col items-center justify-center py-20 px-6 bg-slate-900/50 border border-dashed border-slate-800 rounded-[3rem] text-center mt-4">
                      <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-black/50 border border-slate-800 rotate-3 transition-transform hover:rotate-6">
                          <BarChart3 className="w-8 h-8 text-slate-600" />
                      </div>
                      <h3 className="text-white font-black uppercase tracking-tight text-lg mb-2">Nenhum contrato encontrado</h3>
                      <p className="text-slate-500 text-xs font-medium max-w-sm leading-relaxed">
                          Não encontramos registros com os filtros atuais. <br/>
                          Limpe a busca ou inicie uma nova operação.
                      </p>
                  </div>
              )}
          </div>

          <aside className={`w-full lg:w-96 space-y-5 sm:space-y-6 ${mobileDashboardTab === 'CONTRACTS' ? 'hidden md:block' : ''}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  
                  {/* CARD CAPITAL NA RUA */}
                  <StatCard 
                    title="Capital na Rua" 
                    value={`R$ ${stats.totalLent.toLocaleString()}`} 
                    rawValue={stats.totalLent} 
                    icon={<Banknote size={20} />} 
                    target={activeUser?.targetCapital} 
                    current={stats.totalLent} 
                    isStealthMode={isStealthMode}
                    indicatorColor="bg-blue-500"
                    footer={
                        <>
                            <div className="flex items-center gap-1.5 text-blue-400">
                                <Users size={12}/>
                                <span className="text-[10px] font-black uppercase">{stats.activeCount} Contratos Ativos</span>
                            </div>
                        </>
                    }
                  />

                  {/* CARD RECEBIDO TOTAL */}
                  <StatCard 
                    title="Recebido (Total)" 
                    value={`R$ ${stats.totalReceived.toLocaleString()}`} 
                    rawValue={stats.totalReceived} 
                    icon={<CheckCircle2 size={20} />} 
                    isStealthMode={isStealthMode}
                    indicatorColor="bg-purple-500"
                    footer={
                        <>
                            <div className="flex items-center gap-1.5 text-purple-400">
                                <Calendar size={12}/>
                                <span className="text-[10px] font-black uppercase">+ {formatMoney(stats.receivedThisMonth, isStealthMode)} Este Mês</span>
                            </div>
                        </>
                    }
                  />

                  {/* CARD LUCRO PROJETADO */}
                  <StatCard 
                    title="Lucro Projetado" 
                    value={`R$ ${stats.expectedProfit.toLocaleString()}`} 
                    rawValue={stats.expectedProfit} 
                    icon={<Briefcase size={20} />} 
                    target={activeUser?.targetProfit} 
                    current={stats.expectedProfit} 
                    isStealthMode={isStealthMode}
                    indicatorColor="bg-amber-500"
                    footer={
                        <>
                            <div className="flex items-center gap-1.5 text-amber-400">
                                <Percent size={12}/>
                                <span className="text-[10px] font-black uppercase">Retorno Est. {stats.roi.toFixed(1)}%</span>
                            </div>
                        </>
                    }
                  />

                  {/* CARD LUCRO DISPONÍVEL */}
                  <ProfitCard balance={stats.interestBalance} onWithdraw={() => setWithdrawModal(true)} isStealthMode={isStealthMode} />
              </div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col items-center shadow-xl">
                  <h3 className="text-[10px] font-black uppercase mb-6 tracking-widest text-slate-500 flex items-center gap-2 w-full"><PieIcon className="w-4 h-4 text-blue-500" /> Saúde da Carteira</h3>
                  <div style={{ width: '100%', minHeight: 300 }}> 
                      <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={stats.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={4}>{stats.pieData.map((entry: any, index: number) => <Cell key={index} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }} /></PieChart></ResponsiveContainer>
                  </div>
                  <h3 className="text-[10px] font-black uppercase mb-4 mt-8 tracking-widest text-slate-500 flex items-center gap-2 w-full pt-6 border-t border-slate-800"><TrendingUp className="w-4 h-4 text-emerald-500" /> Evolução (6 Meses)</h3>
                  <div style={{ width: '100%', minHeight: 300, marginBottom: '1.5rem' }}>
                      <ResponsiveContainer width="100%" height={300}><LineChart data={stats.lineChartData}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} /><YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }} /><Line type="monotone" dataKey="Entradas" stroke="#10b981" strokeWidth={3} dot={{r: 4}} /><Line type="monotone" dataKey="Saidas" stroke="#f43f5e" strokeWidth={3} dot={{r: 4}} /></LineChart></ResponsiveContainer>
                  </div>

                  <AIBalanceInsight loans={loans} sources={sources} activeUser={activeUser} />
              </div>
          </aside>
      </div>
    </div>
  );
};
