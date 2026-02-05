import React from 'react';
import { Loan, CapitalSource, UserProfile, Installment, Agreement, AgreementInstallment, LedgerEntry } from '../../../types';

export interface LoanCardProps {
  loan: Loan;
  sources: CapitalSource[];
  isExpanded: boolean;
  activeUser: UserProfile | null;
  onToggleExpand: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onMessage: (e: React.MouseEvent) => void;
  onArchive: (e: React.MouseEvent) => void;
  onRestore: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onNote: (e: React.MouseEvent) => void;
  onPayment: (loan: Loan, inst: Installment, calculations: any) => void;
  onPortalLink: (e: React.MouseEvent) => void;
  onUploadPromissoria: (e: React.MouseEvent) => void;
  onUploadDoc: (e: React.MouseEvent) => void;
  onViewPromissoria: (e: React.MouseEvent, url: string) => void;
  onViewDoc: (e: React.MouseEvent, url: string) => void;
  onReviewSignal: (signalId: string, status: 'APROVADO' | 'NEGADO') => void;
  onOpenComprovante: (url: string) => void;
  onReverseTransaction: (transaction: LedgerEntry, loan: Loan) => void;
  onRenegotiate: (loan: Loan) => void;
  onAgreementPayment: (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => void;
  onRefresh: () => void;
  onNewAporte?: (loan: Loan) => void;
  isStealthMode?: boolean;
}