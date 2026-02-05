
import React from 'react';
import { BarChart3, Banknote, CheckCircle2, Briefcase, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Loan, CapitalSource, LedgerEntry, Agreement, AgreementInstallment, SortOption, UserProfile } from '../types';
import { LoanCard } from '../components/cards/LoanCard';
import { StatCard } from '../components/StatCard';
import { ProfitCard } from '../components/cards/ProfitCard';
import { DashboardAlerts } from '../features/dashboard/DashboardAlerts';
import { DashboardControls } from '../components/dashboard/DashboardControls';
import { AIBalanceInsight } from '../features/dashboard/AIBalanceInsight';

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

              <div className="grid grid-cols-1 gap-4 sm:gap-5">
                  {filteredLoans.map(loan => (
                    <LoanCard key={loan.id} loan={loan} sources={sources} activeUser={activeUser} isExpanded={selectedLoanId === loan.id} onToggleExpand={() => setSelectedLoanId(selectedLoanId === loan.id ? null : loan.id)} onEdit={(e) => { e.stopPropagation(); onEdit(loan); }} onMessage={(e) => { e.stopPropagation(); onMessage(loan); }} onArchive={(e) => { e.stopPropagation(); onArchive(loan); }} onRestore={(e) => { e.stopPropagation(); onRestore(loan); }} onDelete={(e) => { e.stopPropagation(); onDelete(loan); }} onNote={(e) => { e.stopPropagation(); onNote(loan); }} onPayment={(l, i, c) => onPayment(l, i, c)} onPortalLink={(e) => { e.stopPropagation(); onPortalLink(loan); }} onUploadPromissoria={(e) => { e.stopPropagation(); onUploadPromissoria(loan); }} onUploadDoc={(e) => { e.stopPropagation(); onUploadDoc(loan); }} onViewPromissoria={(e, url) => { e.stopPropagation(); onViewPromissoria(url); }} onViewDoc={(e, url) => { e.stopPropagation(); onViewDoc(url); }} onReviewSignal={onReviewSignal} onOpenComprovante={onOpenComprovante} onReverseTransaction={onReverseTransaction} onRenegotiate={onRenegotiate} onNewAporte={onNewAporte} onAgreementPayment={onAgreementPayment} onRefresh={onRefresh} isStealthMode={isStealthMode} />
                  ))}
                  {filteredLoans.length === 0 && <div className="text-center py-24 bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-800 flex flex-col items-center px-4"><div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6"><BarChart3 className="w-8 h-8 text-slate-700" /></div><p className="font-black uppercase text-sm text-slate-500 tracking-widest">Nenhum contrato encontrado</p></div>}
              </div>
          </div>

          <aside className={`w-full lg:w-96 space-y-5 sm:space-y-6 ${mobileDashboardTab === 'CONTRACTS' ? 'hidden md:block' : ''}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  <StatCard title="Capital na Rua" value={`R$ ${stats.totalLent.toLocaleString()}`} rawValue={stats.totalLent} icon={<Banknote />} target={activeUser?.targetCapital} current={stats.totalLent} isStealthMode={isStealthMode} />
                  <StatCard title="Recebido (Total)" value={`R$ ${stats.totalReceived.toLocaleString()}`} rawValue={stats.totalReceived} icon={<CheckCircle2 />} isStealthMode={isStealthMode} />
                  <StatCard title="Lucro Projetado" value={`R$ ${stats.expectedProfit.toLocaleString()}`} rawValue={stats.expectedProfit} icon={<Briefcase />} target={activeUser?.targetProfit} current={stats.expectedProfit} isStealthMode={isStealthMode} />
                  <ProfitCard balance={stats.interestBalance} onWithdraw={() => setWithdrawModal(true)} isStealthMode={isStealthMode} />
              </div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col items-center shadow-xl">
                  <h3 className="text-[10px] font-black uppercase mb-6 tracking-widest text-slate-500 flex items-center gap-2 w-full"><PieIcon className="w-4 h-4 text-blue-500" /> Saúde da Carteira</h3>
                  <div className="w-full h-48"> 
                      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={4}>{stats.pieData.map((entry: any, index: number) => <Cell key={index} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }} /></PieChart></ResponsiveContainer>
                  </div>
                  <h3 className="text-[10px] font-black uppercase mb-4 mt-8 tracking-widest text-slate-500 flex items-center gap-2 w-full pt-6 border-t border-slate-800"><TrendingUp className="w-4 h-4 text-emerald-500" /> Evolução (6 Meses)</h3>
                  <div className="w-full h-48 mb-6">
                      <ResponsiveContainer width="100%" height="100%"><LineChart data={stats.lineChartData}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} /><YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }} /><Line type="monotone" dataKey="Entradas" stroke="#10b981" strokeWidth={3} dot={{r: 4}} /><Line type="monotone" dataKey="Saidas" stroke="#f43f5e" strokeWidth={3} dot={{r: 4}} /></LineChart></ResponsiveContainer>
                  </div>

                  <AIBalanceInsight loans={loans} sources={sources} activeUser={activeUser} />
              </div>
          </aside>
      </div>
    </div>
  );
};
