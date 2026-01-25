
import React from 'react';
import { ModalHost } from '../components/modals/ModalHost';
import { UserProfile, Client, CapitalSource, Loan } from '../types';
import { filesService } from '../services/files.service';
import { supabase } from '../lib/supabase';
import { AIAssistantModal } from '../components/modals/AIAssistantModal';

interface ModalHostContainerProps {
  ui: any;
  activeUser: UserProfile | null;
  clients: Client[];
  sources: CapitalSource[];
  loans: Loan[];
  loanCtrl: any;
  clientCtrl: any;
  sourceCtrl: any;
  paymentCtrl: any;
  profileCtrl: any;
  adminCtrl: any;
  fileCtrl: any;
  aiCtrl: any;
  showToast: any;
  fetchFullData: any;
  handleLogout: any;
}

export const ModalHostContainer: React.FC<ModalHostContainerProps> = ({
  ui, activeUser, clients, sources, loans,
  loanCtrl, clientCtrl, sourceCtrl, paymentCtrl, profileCtrl, adminCtrl, fileCtrl, aiCtrl,
  showToast, fetchFullData, handleLogout
}) => {
  return (
    <>
       <ModalHost 
           {...ui}
           activeUser={activeUser} clients={clients} sources={sources} loans={loans}
           onCloseForm={() => { ui.setIsFormOpen(false); ui.setEditingLoan(null); }}
           onSaveLoan={loanCtrl.handleSaveLoan}
           onCloseClientModal={() => ui.setIsClientModalOpen(false)}
           onPickContact={clientCtrl.handlePickContact}
           onSaveClient={clientCtrl.handleSaveClient}
           onCloseSourceModal={() => ui.setIsSourceModalOpen(false)}
           onSaveSource={sourceCtrl.handleSaveSource}
           onClosePaymentModal={() => ui.setPaymentModal(null)}
           onConfirmPayment={paymentCtrl.handlePayment}
           onOpenMessageFromPayment={(l) => { ui.setMessageModalLoan(l); ui.setPaymentModal(null); }}
           onCloseAddFunds={() => ui.setIsAddFundsModalOpen(null)}
           onConfirmAddFunds={sourceCtrl.handleAddFunds}
           onCloseWithdraw={() => ui.setWithdrawModal(false)}
           onConfirmWithdraw={sourceCtrl.handleWithdrawProfit}
           onCloseNote={() => ui.setNoteModalLoan(null)}
           onSaveNote={loanCtrl.handleSaveNote}
           onCloseConfirmation={() => ui.setConfirmation(null)}
           onExecuteConfirmation={loanCtrl.executeConfirmation}
           onCloseDonate={() => ui.setDonateModal(false)}
           showToast={showToast}
           onCloseDeleteAccount={() => ui.setDeleteAccountModal(false)}
           onExecuteDeleteAccount={async () => { if(ui.deleteAccountAgree && ui.deleteAccountConfirm === 'DELETAR') { await supabase.from('perfis').delete().eq('id', activeUser?.id); handleLogout(); } }}
           onCloseResetData={() => ui.setResetDataModal(false)}
           onExecuteResetData={profileCtrl.handleResetData}
           onCloseCalc={() => ui.setShowCalcModal(false)}
           onCloseAgenda={() => ui.setShowAgendaModal(false)}
           onSelectLoanFromAgenda={(id) => { ui.setSelectedLoanId(id); ui.setShowAgendaModal(false); }}
           onCloseFlow={() => ui.setShowFlowModal(false)}
           onCloseReceipt={() => ui.setShowReceipt(null)}
           onCloseMessage={() => ui.setMessageModalLoan(null)}
           onCloseProof={() => ui.setViewProofModal(null)}
           onCloseMasterEdit={() => ui.setMasterEditUser(null)}
           onSaveMasterEdit={adminCtrl.handleMasterUpdateUser}
           onCloseImportPreview={() => { ui.setShowImportPreviewModal(false); ui.setImportCandidates([]); }}
           toggleImportSelection={fileCtrl.toggleImportSelection}
           onConfirmImportSelection={() => fileCtrl.handleConfirmImport(activeUser, fetchFullData)}
           fileCtrl={fileCtrl}
       />
       
       {ui.isAiAssistantOpen && (
           <AIAssistantModal 
                onClose={() => ui.setIsAiAssistantOpen(false)} 
                onCommandDetected={aiCtrl.handleAICommand}
                loans={loans}
                sources={sources}
                activeUser={activeUser}
           />
       )}

       <input type="file" ref={ui.promissoriaFileInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => filesService.handlePromissoriaUpload(e.target.files?.[0] as File, activeUser, String(ui.promissoriaUploadLoanId), showToast, fetchFullData)}/>
       <input type="file" ref={ui.extraDocFileInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => filesService.handleExtraDocUpload(e.target.files?.[0] as File, activeUser, String(ui.extraDocUploadLoanId), 'CONFISSAO', showToast, fetchFullData)}/>
    </>
  );
};
