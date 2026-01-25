
import React from 'react';
import { Scale, CheckCircle2, History, TrendingUp, HandCoins, FileText, Scroll, MessageCircle, ShieldCheck, Printer } from 'lucide-react';
import { Loan, CapitalSource, UserProfile, Agreement, AgreementInstallment, LedgerEntry } from '../types';
import { LoanCard } from '../components/cards/LoanCard';
import { formatMoney } from '../utils/formatters';

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

export const LegalPage: React.FC<LegalPageProps> = ({
  loans, sources, activeUser, ui, loanCtrl, fileCtrl, onRefresh, onAgreementPayment, onReviewSignal, onReverseTransaction, isStealthMode, showToast
}) => {
  // Filtra apenas contratos que possuem acordos ativos
  const legalLoans = loans.filter(l => l.activeAgreement && (l.activeAgreement.status === 'ACTIVE' || l.activeAgreement.status === 'ATIVO'));
  
  // Estatísticas Rápidas do Setor
  const totalAgreements = legalLoans.length;
  const totalNegotiatedValue = legalLoans.reduce((acc, l) => acc + (l.activeAgreement?.negotiatedTotal || 0), 0);
  const totalReceivedAgreement = legalLoans.reduce((acc, l) => {
      if (!l.activeAgreement) return acc;
      return acc + l.activeAgreement.installments.reduce((sum, i) => sum + i.paidAmount, 0);
  }, 0);

  return (
    <div className="space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
                    <Scale className="text-indigo-500" size={28}/> Departamento Jurídico
                </h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gestão de Acordos e Recuperação de Crédito</p>
            </div>
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
                <p className="text-2xl font-black text-white">{formatMoney(totalNegotiatedValue, isStealthMode)}</p>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-500/20 p-5 rounded-3xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-500"><HandCoins size={20}/></div>
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Recuperado (Acordos)</p>
                </div>
                <p className="text-2xl font-black text-emerald-400">{formatMoney(totalReceivedAgreement, isStealthMode)}</p>
            </div>
        </div>

        {/* CENTRAL DE DOCUMENTOS & MODELOS */}
        <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <FileText size={16} className="text-slate-600"/> Protocolos & Documentos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* DOC 1: Confissão */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 hover:border-indigo-500/50 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-all"><Scroll size={20}/></div>
                        <span className="text-[9px] font-black uppercase bg-indigo-950 text-indigo-400 px-2 py-1 rounded">MP 2.200-2</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Confissão de Dívida</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Geração automática com Hash SHA-256 e Assinatura Eletrônica.</p>
                    </div>
                </div>

                {/* DOC 2: Promissória */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 hover:border-blue-500/50 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all"><Printer size={20}/></div>
                        <span className="text-[9px] font-black uppercase bg-blue-950 text-blue-400 px-2 py-1 rounded">Padrão</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Nota Promissória</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Modelo pronto para impressão direta do sistema.</p>
                    </div>
                </div>

                {/* DOC 3: Notificação */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 hover:border-amber-500/50 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-all"><MessageCircle size={20}/></div>
                        <span className="text-[9px] font-black uppercase bg-amber-950 text-amber-400 px-2 py-1 rounded">Extrajudicial</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Notificação de Cobrança</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Modelos de mensagem com validade de notificação via WhatsApp.</p>
                    </div>
                </div>

                {/* DOC 4: Quitação */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 hover:border-emerald-500/50 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all"><ShieldCheck size={20}/></div>
                        <span className="text-[9px] font-black uppercase bg-emerald-950 text-emerald-400 px-2 py-1 rounded">Recibo</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Termo de Quitação</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Disponível automaticamente após a liquidação total.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* LISTA DE CONTRATOS EM ACORDO */}
        <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-slate-600"/> Carteira de Cobrança
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
                            sources={sources}
                            activeUser={activeUser}
                            isExpanded={ui.selectedLoanId === loan.id}
                            onToggleExpand={() => ui.setSelectedLoanId(ui.selectedLoanId === loan.id ? null : loan.id)}
                            onEdit={(e) => { e.stopPropagation(); ui.setEditingLoan(loan); ui.setIsFormOpen(true); }}
                            onMessage={(e) => { e.stopPropagation(); ui.setMessageModalLoan(loan); }}
                            onArchive={(e) => { e.stopPropagation(); loanCtrl.openConfirmation({ type: 'ARCHIVE', target: loan, showRefundOption: true }); }}
                            onRestore={(e) => { e.stopPropagation(); loanCtrl.openConfirmation({ type: 'RESTORE', target: loan }); }}
                            onDelete={(e) => { e.stopPropagation(); loanCtrl.openConfirmation({ type: 'DELETE', target: loan, showRefundOption: true }); }}
                            onNote={(e) => { e.stopPropagation(); ui.setNoteModalLoan(loan); ui.setNoteText(loan.notes); }}
                            onPayment={(l, i, c) => ui.setPaymentModal({ loan: l, inst: i, calculations: c })} // Fallback para parcelas normais se houver bug visual
                            onPortalLink={(e) => { e.stopPropagation(); loanCtrl.handleGenerateLink(loan); }}
                            onUploadPromissoria={(e) => { e.stopPropagation(); ui.setPromissoriaUploadLoanId(String(loan.id)); ui.promissoriaFileInputRef.current?.click(); }}
                            onUploadDoc={(e) => { e.stopPropagation(); ui.setExtraDocUploadLoanId(String(loan.id)); ui.setExtraDocKind('CONFISSAO'); ui.extraDocFileInputRef.current?.click(); }}
                            onViewPromissoria={(e, url) => { e.stopPropagation(); window.open(url, '_blank', 'noreferrer'); }}
                            onViewDoc={(e, url) => { e.stopPropagation(); window.open(url, '_blank', 'noreferrer'); }}
                            onReviewSignal={onReviewSignal}
                            onOpenComprovante={fileCtrl.handleOpenComprovante}
                            onReverseTransaction={onReverseTransaction}
                            onRenegotiate={() => {}} // Não renegocia quem já tem acordo ativo
                            onAgreementPayment={onAgreementPayment}
                            onRefresh={onRefresh}
                            isStealthMode={isStealthMode}
                        />
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};
