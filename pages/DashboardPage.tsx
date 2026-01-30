
import React from 'react';
import { BarChart3, Banknote, CheckCircle2, Briefcase, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Loan, CapitalSource, LedgerEntry, Agreement, AgreementInstallment, SortOption } from '../types';
import { LoanCard } from '../components/cards/LoanCard';
import { StatCard } from '../components/StatCard';
import { ProfitCard } from '../components/cards/ProfitCard';
import { DashboardAlerts } from '../features/dashboard/DashboardAlerts';
import { DashboardControls } from '../components/dashboard/DashboardControls';

interface DashboardPageProps {
  loans: Loan[];
  sources: CapitalSource[];
  filteredLoans: Loan[];
  stats: any;
  activeUser: any;
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
  onAgreementPayment: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void;
  onRefresh: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  loans, sources, filteredLoans, stats, activeUser, mobileDashboardTab, setMobileDashboardTab,
  statusFilter, setStatusFilter, sortOption, setSortOption, searchTerm, setSearchTerm, selectedLoanId, setSelectedLoanId,
  onEdit, onMessage, onArchive, onRestore, onDelete, onNote, onPayment, onPortalLink,
  onUploadPromissoria, onUploadDoc, onViewPromissoria, onViewDoc, onReviewSignal, onOpenComprovante, onReverseTransaction,
  setWithdrawModal, showToast, isStealthMode, onRenegotiate, onAgreementPayment, onRefresh
}) => {
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
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  sortOption={sortOption}
                  setSortOption={setSortOption}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  showToast={showToast}
              />

              <div className="grid grid-cols-1 gap-4 sm:gap-5">
                  {filteredLoans.map(loan => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      sources={sources}
                      activeUser={activeUser}
                      isExpanded={selectedLoanId === loan.id}
                      onToggleExpand={() => setSelectedLoanId(selectedLoanId === loan.id ? null : loan.id)}
                      onEdit={(e) => { e.stopPropagation(); onEdit(loan); }}
                      onMessage={(e) => { e.stopPropagation(); onMessage(loan); }}
                      onArchive={(e) => { e.stopPropagation(); onArchive(loan); }}
                      onRestore={(e) => { e.stopPropagation(); onRestore(loan); }}
                      onDelete={(e) => { e.stopPropagation(); onDelete(loan); }}
                      onNote={(e) => { e.stopPropagation(); onNote(loan); }}
                      onPayment={(l, i, c) => onPayment(l, i, c)}
                      onPortalLink={(e) => { e.stopPropagation(); onPortalLink(loan); }}
                      onUploadPromissoria={(e) => { e.stopPropagation(); onUploadPromissoria(loan); }}
                      onUploadDoc={(e) => { e.stopPropagation(); onUploadDoc(loan); }}
                      onViewPromissoria={(e, url) => { e.stopPropagation(); onViewPromissoria(url); }}
                      onViewDoc={(e, url) => { e.stopPropagation(); onViewDoc(url); }}
                      onReviewSignal={onReviewSignal}
                      onOpenComprovante={onOpenComprovante}
                      onReverseTransaction={onReverseTransaction}
                      onRenegotiate={onRenegotiate}
                      onAgreementPayment={onAgreementPayment}
                      onRefresh={onRefresh}
                      isStealthMode={isStealthMode}
                    />
                  ))}
                  {filteredLoans.length === 0 && <div className="text-center py-16 sm:py-24 bg-slate-900/30 rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-slate-800 flex flex-col items-center px-4"><div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4 sm:mb-6"><BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-slate-700" /></div><p className="font-black uppercase text-xs sm:text-sm text-slate-500 tracking-widest">Nenhum contrato encontrado</p></div>}
              </div>
          </div>

          <aside className={`w-full lg:w-96 space-y-5 sm:space-y-6 ${mobileDashboardTab === 'CONTRACTS' ? 'hidden md:block' : ''}`}>
              <div className="md:hidden grid grid-cols-1 gap-3">
                  <StatCard title="Capital na Rua" value={`R$ ${stats.totalLent.toLocaleString()}`} rawValue={stats.totalLent} icon={<Banknote />} target={activeUser?.targetCapital} current={stats.totalLent} isStealthMode={isStealthMode} />
                  <StatCard title="Recebido (Total)" value={`R$ ${stats.totalReceived.toLocaleString()}`} rawValue={stats.totalReceived} icon={<CheckCircle2 />} isStealthMode={isStealthMode} />
                  <StatCard title="Lucro Projetado" value={`R$ ${stats.expectedProfit.toLocaleString()}`} rawValue={stats.expectedProfit} icon={<Briefcase />} target={activeUser?.targetProfit} current={stats.expectedProfit} isStealthMode={isStealthMode} />
                  <ProfitCard balance={stats.interestBalance} onWithdraw={() => setWithdrawModal(true)} isStealthMode={isStealthMode} />
              </div>
              <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatCard title="Capital na Rua" value={`R$ ${stats.totalLent.toLocaleString()}`} rawValue={stats.totalLent} icon={<Banknote />} target={activeUser?.targetCapital} current={stats.totalLent} isStealthMode={isStealthMode} />
                  <StatCard title="Recebido (Total)" value={`R$ ${stats.totalReceived.toLocaleString()}`} rawValue={stats.totalReceived} icon={<CheckCircle2 />} isStealthMode={isStealthMode} />
                  <StatCard title="Lucro Projetado" value={`R$ ${stats.expectedProfit.toLocaleString()}`} rawValue={stats.expectedProfit} icon={<Briefcase />} target={activeUser?.targetProfit} current={stats.expectedProfit} isStealthMode={isStealthMode} />
                  <ProfitCard balance={stats.interestBalance} onWithdraw={() => setWithdrawModal(true)} isStealthMode={isStealthMode} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 flex flex-col items-center shadow-xl">
                  <h3 className="text-[9px] sm:text-[10px] font-black uppercase mb-6 sm:mb-10 tracking-widest text-slate-500 flex items-center gap-2 w-full"><PieIcon className="w-4 h-4 text-blue-500" /> Saúde da Carteira</h3>
                  <div className="w-full" style={{ height: '200px', minHeight: '200px', width: '100%' }}> 
                      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={4}>{stats.pieData.map((entry: any, index: number) => <Cell key={index} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }} /></PieChart></ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:gap-3 mt-6 w-full">{stats.pieData.map((d: any) => (<div key={d.name} className="flex items-center justify-between bg-slate-950 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl border border-slate-800/50"><div className="flex items-center gap-2 sm:gap-3"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-300">{d.name}</span></div><span className="text-xs sm:text-sm font-black text-white">{d.value}</span></div>))}</div>
                  <h3 className="text-[9px] sm:text-[10px] font-black uppercase mb-4 mt-8 tracking-widest text-slate-500 flex items-center gap-2 w-full pt-6 border-t border-slate-800"><TrendingUp className="w-4 h-4 text-emerald-500" /> Evolução (6 Meses)</h3>
                  <div className="w-full" style={{ height: '200px', minHeight: '200px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%"><LineChart data={stats.lineChartData}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} /><YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }} /><Legend wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} /><Line type="monotone" dataKey="Entradas" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} /><Line type="monotone" dataKey="Saidas" stroke="#f43f5e" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} /></LineChart></ResponsiveContainer>
                  </div>
              </div>
          </aside>
      </div>
    </div>
  );
};