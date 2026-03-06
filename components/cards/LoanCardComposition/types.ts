import React from 'react';
import { Loan, CapitalSource, UserProfile, Installment, Agreement, AgreementInstallment, LedgerEntry } from '../../../types';

export interface LoanCardProps {
  loan: Loan;
  sources: CapitalSource[];
  isExpanded: boolean;
  activeUser: UserProfile | null;
  onToggleExpand: (e: React.MouseEvent) => void;
  onEdit: (loan: Loan) => void;
  onMessage: (loan: Loan) => void;
  onArchive: (loan: Loan) => void;
  onRestore: (loan: Loan) => void;
  onDelete: (loan: Loan) => void;
  onNote: (loan: Loan) => void;
  onPayment: (loan: Loan, inst: Installment, calculations: any) => void;
  onPortalLink: (loan: Loan) => void;
  onUploadPromissoria: (loan: Loan) => void;
  onUploadDoc: (loan: Loan) => void;
  onViewPromissoria: (url: string) => void;
  onViewDoc: (url: string) => void;
  onReviewSignal: (signalId: string, status: 'APROVADO' | 'NEGADO') => void;
  onOpenComprovante: (url: string) => void;
  onReverseTransaction: (transaction: LedgerEntry, loan: Loan) => void;
  onRenegotiate: (loan: Loan) => void;
  onAgreementPayment: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void;
  onRefresh: () => void;
  onNewAporte?: (loan: Loan) => void;
  onNavigate?: (id: string) => void;
  isStealthMode?: boolean;
}