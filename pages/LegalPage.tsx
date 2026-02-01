
import React, { useState } from 'react';
import { Scale, CheckCircle2, History, TrendingUp, HandCoins, FileText, Scroll, MessageCircle, ShieldCheck, Printer, User } from 'lucide-react';
import { Loan, CapitalSource, UserProfile, Agreement, AgreementInstallment, LedgerEntry } from '../types';
import { LoanCard } from '../components/cards/LoanCard';
import { formatMoney } from '../utils/formatters';

// Importação das novas vistas
import { ConfissaoDividaView } from '../features/legal/components/ConfissaoDividaView';
import { NotaPromissoriaView } from '../features/legal/components/NotaPromissoriaView';
import { NotificacaoCobrancaView } from '../features/legal/components/NotificacaoCobrancaView';
import { TermoQuitacaoView } from '../features/legal/components/TermoQuitacaoView';
import { LegalProfileView } from '../features/legal/components/LegalProfileView';

interface LegalPageProps {
  loans: Loan[];
  sources: CapitalSource[];
  activeUser: UserProfile | null;
  ui: any;
  loanCtrl: any;
  fileCtrl: any;
  onRefresh: () => void;
  onAgreementPayment: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void;
  onReviewSignal: (signalId: string, status: 'APROVADO' | 'NEGADO') => void;
  onReverseTransaction: (transaction: LedgerEntry, loan: Loan) => void;
  isStealthMode: boolean;
  showToast: (msg: string, type?: 'error'|'success') => void;
}

type LegalSubView = 'OVERVIEW' | 'CONFISSAO' | 'PROMISSORIA' | 'NOTIFICACAO' | 'QUITACAO' | 'PROFILE';

export const LegalPage: React.FC<LegalPageProps> = (props) => {
  const [subView, setSubView] = useState<LegalSubView>('OVERVIEW');

  // Filtra apenas contratos que possuem acordos ativos
  const legalLoans = props.loans.filter(l => l.activeAgreement && l.activeAgreement.status === 'ACTIVE');
  
  // Estatísticas Rápidas do Setor
  const totalAgreements = legalLoans.length;
  const totalNegotiatedValue = legalLoans.reduce((acc, l) => acc + (l.activeAgreement?.negotiatedTotal || 0), 0);
  const totalReceivedAgreement = legalLoans.reduce((acc, l) => {
      if (!l.activeAgreement) return acc;
      return acc + l.activeAgreement.installments.reduce((sum, i) => sum + i.paidAmount, 0);
  }, 0);

  // Renderização Condicional Baseada na SubView
  if (subView === 'CONFISSAO') return <ConfissaoDividaView loans={props.loans} activeUser={props.activeUser} onBack={() => setSubView('OVERVIEW')} showToast={props.showToast} />;
  if (subView === 'PROMISSORIA') return <NotaPromissoriaView loans={props.loans} activeUser={props.activeUser} onBack={() => setSubView('OVERVIEW')} />;
  if (subView === 'NOTIFICACAO') return <NotificacaoCobrancaView loans={props.loans} activeUser={props.activeUser} onBack={() => setSubView('OVERVIEW')} showToast={props.showToast} />;
  if (subView === 'QUITACAO') return <TermoQuitacaoView loans={props.loans} activeUser={props.activeUser} onBack={() => setSubView('OVERVIEW')} showToast={props.showToast} />;
  if (subView === 'PROFILE') return <LegalProfileView activeUser={props.activeUser} onBack={() => setSubView('OVERVIEW')} />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
                    <Scale className="text-indigo-500" size={28}/> Departamento Jurídico
                </h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gestão de Acordos e Recuperação de Crédito</p>
            </div>
            <button 
                onClick={() => setSubView('PROFILE')}
                className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all flex items-center gap-2 text-[10px] font-black uppercase"
            >
                <User size={16}/> Perfil Jurídico
            </button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-3xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400"><History size={20}/></div>
                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Acordos Ativos</p>
                </div>
                <p className="text-2xl font-black text-white">{totalAgreements}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-slate-800 rounded-xl text-white"><TrendingUp size={20}/></div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Volume Negociado</p>
                </div>
                <p className="text-2xl font-black text-white">{formatMoney(totalNegotiatedValue, props.isStealthMode)}</p>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-500/20 p-5 rounded-3xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-500"><HandCoins size={20}/></div>
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Recuperado (Acordos)</p>
                </div>
                <p className="text-2xl font-black text-emerald-400">{formatMoney(totalReceivedAgreement, props.isStealthMode)}</p>
            </div>
        </div>

        {/* CENTRAL DE DOCUMENTOS & MODELOS */}
        <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <FileText size={16} className="text-slate-600"/> Protocolos & Documentos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* DOC 1: Confissão */}
                <button onClick={() => setSubView('CONFISSAO')} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 hover:border-indigo-500 transition-all group text-left">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-all"><Scroll size={20}/></div>
                        <span className="text-[9px] font-black uppercase bg-indigo-950 text-indigo-400 px-2 py-1 rounded">Gerar</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Confissão de Dívida</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Instrumento Particular com validade de Título Executivo.</p>
                    </div>
                </button>

                {/* DOC 2: Promissória */}
                <button onClick={() => setSubView('PROMISSORIA')} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 hover:border-blue-500 transition-all group text-left">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all"><Printer size={20}/></div>
                        <span className="text-[9px] font-black uppercase bg-blue-950 text-blue-400 px-2 py-1 rounded">Imprimir</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Nota Promissória</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Modelos padronizados para impressão e assinatura física.</p>
                    </div>
                </button>

                {/* DOC 3: Notificação */}
                <button onClick={() => setSubView('NOTIFICACAO')} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 hover:border-amber-500 transition-all group text-left">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-all"><MessageCircle size={20}/></div>
                        <span className="text-[9px] font-black uppercase bg-amber-950 text-amber-400 px-2 py-1 rounded">Cobrar</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Notificação de Cobrança</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Modelos de avisos amigáveis e extrajudiciais.</p>
                    </div>
                </button>

                {/* DOC 4: Quitação */}
                <button onClick={() => setSubView('QUITACAO')} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 hover:border-emerald-500 transition-all group text-left">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all"><ShieldCheck size={20}/></div>
                        <span className="text-[9px] font-black uppercase bg-emerald-950 text-emerald-400 px-2 py-1 rounded">Recibo</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Termo de Quitação</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Formalização da liquidação total para contratos pagos.</p>
                    </div>
                </button>
            </div>
        </div>

        {/* LISTA DE CONTRATOS EM ACORDO */}
        <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-slate-600"/> Acordos Ativos
            </h3>
            
            {legalLoans.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-800">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Scale className="text-slate-700" size={32}/>
                    </div>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Nenhum acordo ativo no momento</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5">
                    {legalLoans.map(loan => (
                        <LoanCard
                            key={loan.id}
                            loan={loan}
                            sources={props.sources}
                            activeUser={props.activeUser}
                            isExpanded={props.ui.selectedLoanId === loan.id}
                            onToggleExpand={() => props.ui.setSelectedLoanId(props.ui.selectedLoanId === loan.id ? null : loan.id)}
                            onEdit={(e) => { e.stopPropagation(); props.ui.setEditingLoan(loan); props.ui.openModal('LOAN_FORM'); }}
                            onMessage={(e) => { e.stopPropagation(); props.ui.setMessageModalLoan(loan); props.ui.openModal('MESSAGE_HUB'); }}
                            onArchive={(e) => { e.stopPropagation(); props.loanCtrl.openConfirmation({ type: 'ARCHIVE', target: loan, showRefundOption: true }); }}
                            onRestore={(e) => { e.stopPropagation(); props.loanCtrl.openConfirmation({ type: 'RESTORE', target: loan }); }}
                            onDelete={(e) => { e.stopPropagation(); props.loanCtrl.openConfirmation({ type: 'DELETE', target: loan, showRefundOption: true }); }}
                            onNote={(e) => { e.stopPropagation(); props.ui.setNoteModalLoan(loan); props.ui.setNoteText(loan.notes); props.ui.openModal('NOTE'); }}
                            onPayment={(l, i, c) => props.ui.setPaymentModal({ loan: l, inst: i, calculations: c })}
                            onPortalLink={(e) => { e.stopPropagation(); props.loanCtrl.handleGenerateLink(loan); }}
                            onUploadPromissoria={(e) => { e.stopPropagation(); props.ui.setPromissoriaUploadLoanId(String(loan.id)); props.ui.promissoriaFileInputRef.current?.click(); }}
                            onUploadDoc={(e) => { e.stopPropagation(); props.ui.setExtraDocUploadLoanId(String(loan.id)); props.ui.setExtraDocKind('CONFISSAO'); props.ui.extraDocFileInputRef.current?.click(); }}
                            onViewPromissoria={(e, url) => { e.stopPropagation(); window.open(url, '_blank', 'noreferrer'); }}
                            onViewDoc={(e, url) => { e.stopPropagation(); window.open(url, '_blank', 'noreferrer'); }}
                            onReviewSignal={props.onReviewSignal}
                            onOpenComprovante={props.fileCtrl.handleOpenComprovante}
                            onReverseTransaction={props.onReverseTransaction}
                            onRenegotiate={() => {}}
                            onAgreementPayment={props.onAgreementPayment}
                            onRefresh={props.onRefresh}
                            isStealthMode={props.isStealthMode}
                        />
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};
