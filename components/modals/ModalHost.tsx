
import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import { LoanModalsWrapper } from './wrappers/LoanModalsWrapper';
import { FinanceModalsWrapper } from './wrappers/FinanceModalsWrapper';
import { SystemModalsWrapper } from './wrappers/SystemModalsWrapper';

export const ModalHost: React.FC = () => {
  const { activeModal } = useModal();

  if (!activeModal) return null;

  return (
    <>
        <LoanModalsWrapper />
        <FinanceModalsWrapper />
        <SystemModalsWrapper />
    </>
  );
};
