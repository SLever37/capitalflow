
import React, { useMemo } from 'react';
import { DashboardPage } from '../pages/DashboardPage';
import { Loan, CapitalSource, UserProfile } from '../types';
import { filterLoans } from '../domain/filters/loanFilters';
import { buildDashboardStats } from '../domain/dashboard/stats';

interface DashboardContainerProps {
  loans: Loan[];
  sources: CapitalSource[];
  activeUser: UserProfile | null;
  mobileDashboardTab: 'CONTRACTS' | 'BALANCE';
  setMobileDashboardTab: (val: 'CONTRACTS' | 'BALANCE') => void;
  statusFilter: any;
  setStatusFilter: (val: any) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  ui: any;
  loanCtrl: any;
  fileCtrl: any;
  showToast: any;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  loans, sources, activeUser, mobileDashboardTab, setMobileDashboardTab,
  statusFilter, setStatusFilter, searchTerm, setSearchTerm, ui, loanCtrl, fileCtrl, showToast
}) => {
  const filteredLoans = useMemo(() => filterLoans(loans, searchTerm, statusFilter), [loans, searchTerm, statusFilter]);
  const stats = useMemo(() => buildDashboardStats(loans, activeUser), [loans, activeUser]);

  return (
    <DashboardPage 
        loans={loans} sources={sources} filteredLoans={filteredLoans} stats={stats} activeUser={activeUser}
        mobileDashboardTab={mobileDashboardTab} setMobileDashboardTab={setMobileDashboardTab}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        selectedLoanId={ui.selectedLoanId} setSelectedLoanId={ui.setSelectedLoanId}
        onEdit={(l) => { ui.setEditingLoan(l); ui.setIsFormOpen(true); }}
        onMessage={(l) => ui.setMessageModalLoan(l)}
        onArchive={(l) => loanCtrl.openConfirmation({ type: 'ARCHIVE', target: l, showRefundOption: true })}
        onRestore={(l) => loanCtrl.openConfirmation({ type: 'RESTORE', target: l })}
        onDelete={(l) => loanCtrl.openConfirmation({ type: 'DELETE', target: l, showRefundOption: true })}
        onNote={(l) => { ui.setNoteModalLoan(l); ui.setNoteText(l.notes); }}
        onPayment={(l, i, c) => ui.setPaymentModal({ loan: l, inst: i, calculations: c })}
        onPortalLink={(l) => loanCtrl.handleGenerateLink(l)}
        onUploadPromissoria={(l) => { ui.setPromissoriaUploadLoanId(String(l.id)); ui.promissoriaFileInputRef.current?.click(); }}
        onUploadDoc={(l) => { ui.setExtraDocUploadLoanId(String(l.id)); ui.setExtraDocKind('CONFISSAO'); ui.extraDocFileInputRef.current?.click(); }}
        onViewPromissoria={(url) => window.open(url, '_blank', 'noreferrer')}
        onViewDoc={(url) => window.open(url, '_blank', 'noreferrer')}
        onReviewSignal={loanCtrl.handleReviewSignal}
        onOpenComprovante={fileCtrl.handleOpenComprovante}
        onReverseTransaction={loanCtrl.openReverseTransaction}
        setWithdrawModal={ui.setWithdrawModal}
        showToast={showToast}
        isStealthMode={ui.isStealthMode}
    />
  );
};
