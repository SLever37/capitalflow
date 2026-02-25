
import React, { useMemo } from 'react';
import { DashboardPage } from '../pages/DashboardPage';
import { Loan, CapitalSource, UserProfile, Agreement, AgreementInstallment } from '../types';
import { filterLoans } from '../domain/filters/loanFilters';
import { buildDashboardStats } from '../domain/dashboard/stats';
import { agreementService } from '../features/agreements/services/agreementService';

interface DashboardContainerProps {
  loans: Loan[];
  sources: CapitalSource[];
  activeUser: UserProfile | null;
  staffMembers: UserProfile[];
  mobileDashboardTab: 'CONTRACTS' | 'BALANCE';
  setMobileDashboardTab: (val: 'CONTRACTS' | 'BALANCE') => void;
  statusFilter: any;
  setStatusFilter: (val: any) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedStaffId: string;
  setSelectedStaffId: (id: string) => void;
  ui: any;
  loanCtrl: any;
  fileCtrl: any;
  showToast: any;
  onRefresh: () => void;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  loans, sources, activeUser, staffMembers, mobileDashboardTab, setMobileDashboardTab,
  statusFilter, setStatusFilter, searchTerm, setSearchTerm, selectedStaffId, setSelectedStaffId,
  ui, loanCtrl, fileCtrl, showToast, onRefresh
}) => {
  
  // LÓGICA DE FILTRAGEM DE EQUIPE
  const scopeLoans = useMemo(() => {
    if (!activeUser || activeUser.accessLevel !== 1) return loans;
    if (selectedStaffId === 'ALL') return loans;
    return loans.filter(l => l.operador_responsavel_id === selectedStaffId);
  }, [loans, selectedStaffId, activeUser]);

  const filteredLoans = useMemo(() => filterLoans(scopeLoans, searchTerm, statusFilter, ui.sortOption), [scopeLoans, searchTerm, statusFilter, ui.sortOption]);
  const stats = useMemo(() => buildDashboardStats(scopeLoans, activeUser), [scopeLoans, activeUser]);

  const handleAgreementPayment = async (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => {
      if (!activeUser || !confirm(`Confirmar recebimento da parcela ${inst.number} (R$ ${inst.amount.toFixed(2)})?`)) return;
      try {
          await agreementService.processPayment(agreement, inst, inst.amount, loan.sourceId, activeUser);
          showToast("Parcela do acordo recebida!", "success");
          ui.setShowReceipt({ loan, inst: { ...inst, agreementId: agreement.id }, amountPaid: inst.amount, type: 'AGREEMENT_PAYMENT' });
          ui.openModal('RECEIPT');
          onRefresh();
      } catch (e: any) {
          showToast("Erro ao processar pagamento: " + e.message, "error");
      }
  };

  const handleNewAporte = (loan: Loan) => {
      ui.setNewAporteModalLoan(loan);
      ui.openModal('NEW_APORTE');
  };

  return (
    <DashboardPage 
        loans={loans} sources={sources} filteredLoans={filteredLoans} stats={stats} 
        activeUser={activeUser} staffMembers={staffMembers} selectedStaffId={selectedStaffId} onStaffChange={setSelectedStaffId}
        mobileDashboardTab={mobileDashboardTab} setMobileDashboardTab={setMobileDashboardTab}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        sortOption={ui.sortOption} setSortOption={ui.setSortOption}
        selectedLoanId={ui.selectedLoanId} setSelectedLoanId={ui.setSelectedLoanId}
        onEdit={(l) => { ui.setEditingLoan(l); ui.openModal('LOAN_FORM', l); }}
        onMessage={(l) => { ui.setMessageModalLoan(l); ui.openModal('MESSAGE_HUB'); }}
        onArchive={(l) => loanCtrl.openConfirmation({ type: 'ARCHIVE', target: l, showRefundOption: true })}
        onRestore={(l) => loanCtrl.openConfirmation({ type: 'RESTORE', target: l })}
        onDelete={(l) => loanCtrl.openConfirmation({ type: 'DELETE', target: l, showRefundOption: true })}
        onNote={(l) => { ui.setNoteModalLoan(l); ui.setNoteText(l.notes); ui.openModal('NOTE'); }}
        onPayment={(l, i, c) => { ui.setPaymentModal({ loan: l, inst: i, calculations: c }); ui.openModal('PAYMENT'); }}
        onPortalLink={(l) => loanCtrl.handleGenerateLink(l)}
        onUploadPromissoria={(l) => { ui.setPromissoriaUploadLoanId(String(l.id)); ui.promissoriaFileInputRef.current?.click(); }}
        onUploadDoc={(l) => { ui.setExtraDocUploadLoanId(String(l.id)); ui.setExtraDocKind('CONFISSAO'); ui.extraDocFileInputRef.current?.click(); }}
        onViewPromissoria={(url) => window.open(url, '_blank', 'noreferrer')}
        onViewDoc={(url) => window.open(url, '_blank', 'noreferrer')}
        onReviewSignal={loanCtrl.handleReviewSignal}
        onOpenComprovante={fileCtrl.handleOpenComprovante}
        onReverseTransaction={loanCtrl.openReverseTransaction}
        onRenegotiate={(l) => { ui.setRenegotiationModalLoan(l); ui.openModal('RENEGOTIATION', l); }}
        onNewAporte={handleNewAporte}
        onAgreementPayment={handleAgreementPayment}
        onRefresh={onRefresh}
        setWithdrawModal={() => ui.openModal('WITHDRAW')}
        showToast={showToast}
        isStealthMode={ui.isStealthMode}
    />
  );
};
