
import React from 'react';
import { SourcesPage } from '../pages/SourcesPage';
import { CapitalSource } from '../types';

interface SourcesContainerProps {
  sources: CapitalSource[];
  ui: any;
  sourceCtrl: any;
  loanCtrl: any;
}

export const SourcesContainer: React.FC<SourcesContainerProps> = ({ 
  sources, ui, sourceCtrl, loanCtrl 
}) => {
  return (
    <SourcesPage 
        sources={sources} setIsSourceModalOpen={ui.setIsSourceModalOpen} setEditingSource={ui.setEditingSource} editingSource={ui.editingSource}
        setIsAddFundsModalOpen={ui.setIsAddFundsModalOpen} setAddFundsValue={ui.setAddFundsValue} openConfirmation={loanCtrl.openConfirmation} handleUpdateSourceBalance={sourceCtrl.handleUpdateSourceBalance}
        isStealthMode={ui.isStealthMode}
    />
  );
};
