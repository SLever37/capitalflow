
import React from 'react';
import { useModal } from '../../../contexts/ModalContext';
import { Modal } from '../../ui/Modal';
import { AdminModals } from '../ModalGroups';
import { ConfirmationModalWrapper, ReceiptModalWrapper, MessageHubWrapper, DonateModalWrapper, AgendaWrapper, FlowWrapper, CalculatorWrapper, AIWrapper, NoteWrapper } from '../ModalWrappers';
import { RenegotiationModal } from '../../../features/agreements/components/RenegotiationModal';
import { CheckSquare, Square, Banknote } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

export const SystemModalsWrapper = () => {
    const { activeModal, closeModal, ui, activeUser, fileCtrl, showToast, fetchFullData, loanCtrl, profileCtrl } = useModal();

    switch (activeModal?.type) {
        case 'CONFIRMATION': return <ConfirmationModalWrapper />;
        case 'RECEIPT': return <ReceiptModalWrapper />;
        case 'MESSAGE_HUB': return <MessageHubWrapper />;
        case 'DONATE': return <DonateModalWrapper />;
        case 'CALC': return <CalculatorWrapper />;
        case 'FLOW': return <FlowWrapper />;
        case 'AI_ASSISTANT': return <AIWrapper />;
        case 'NOTE': return <NoteWrapper />;
        case 'MASTER_EDIT_USER': return <AdminModals />;
        case 'DELETE_ACCOUNT':
            return (
               <Modal onClose={closeModal} title="EXCLUIR CONTA">
                   <div className="space-y-4">
                       <div className="bg-rose-950/30 p-4 rounded-xl border border-rose-500/30 text-rose-200 text-sm font-bold text-center">ATENÇÃO: Esta ação é irreversível.</div>
                       <div className="flex items-center gap-3"><input type="checkbox" checked={ui.deleteAccountAgree} onChange={e => ui.setDeleteAccountAgree(e.target.checked)} className="w-6 h-6 accent-rose-600" /><span className="text-white text-sm">Eu entendo que perderei tudo.</span></div>
                       <input type="text" placeholder="Digite DELETAR para confirmar" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.deleteAccountConfirm} onChange={e => ui.setDeleteAccountConfirm(e.target.value)} />
                       <button onClick={async () => { if(ui.deleteAccountAgree && ui.deleteAccountConfirm === 'DELETAR') { await profileCtrl.handleDeleteAccount(); } }} disabled={!ui.deleteAccountAgree || ui.deleteAccountConfirm !== 'DELETAR'} className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl uppercase disabled:opacity-50">Excluir Tudo</button>
                   </div>
               </Modal>
            );
        case 'RESET_DATA':
            return activeUser ? (
               <Modal onClose={closeModal} title="Zerar Dados">
                   <div className="space-y-4">
                       <p className="text-slate-400 text-sm">Apaga clientes e contratos, mantendo a conta.</p>
                       {activeUser.id !== 'DEMO' && <input type="password" placeholder="Sua senha atual" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.resetPasswordInput} onChange={e => ui.setResetPasswordInput(e.target.value)} />}
                       <button onClick={profileCtrl.handleResetData} className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl uppercase">Confirmar Reset</button>
                   </div>
               </Modal>
            ) : null;
        case 'AGENDA':
            const handleSystemAction = (type: string, meta: any) => {
                ui.closeModal(); 
                if (type === 'PAYMENT' && meta?.loanId) {
                    // Logic handled in view, here simply close agenda to reveal underlying view
                } else if (type === 'PORTAL_REVIEW' && meta?.comprovanteUrl) {
                    ui.openModal('PROOF_VIEW', meta.comprovanteUrl);
                }
            };
            return <AgendaWrapper onSystemAction={handleSystemAction} />;
        
        case 'PROOF_VIEW':
            return activeModal.payload ? (
                <Modal onClose={closeModal} title="Comprovante"><img src={activeModal.payload} alt="Comprovante" className="w-full h-auto rounded-xl" /></Modal>
            ) : null;

        case 'RENEGOTIATION':
            return activeUser && activeModal.payload ? (
               <RenegotiationModal 
                   loan={activeModal.payload}
                   activeUser={activeUser}
                   onClose={closeModal}
                   onSuccess={() => { showToast("Acordo criado com sucesso!", "success"); fetchFullData(activeUser.id); }}
               />
            ) : null;

        case 'IMPORT_SHEET_SELECT':
            return (
               <Modal onClose={closeModal} title="Selecione a Aba">
                   <div className="space-y-2">
                       <p className="text-slate-400 text-sm mb-4">O arquivo possui múltiplas planilhas. Qual deseja importar?</p>
                       {ui.importSheetNames.map((sheet: string) => (
                           <button key={sheet} onClick={() => fileCtrl.selectSheet(sheet)} className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-blue-500 hover:text-blue-400 transition-all font-bold text-white">
                               {sheet}
                           </button>
                       ))}
                   </div>
               </Modal>
            );

        case 'IMPORT_PREVIEW':
            return (
               <Modal onClose={fileCtrl.cancelImport} title="Selecionar Dados">
                   <div className="space-y-4">
                       <p className="text-slate-400 text-xs">Foram encontrados {ui.importCandidates.length} registros.</p>
                       <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-[300px] overflow-y-auto custom-scrollbar">
                           {ui.importCandidates.map((c: any, i: number) => (
                               <div key={i} className="flex items-center gap-3 p-3 border-b border-slate-800 last:border-0 hover:bg-slate-900 transition-colors cursor-pointer" onClick={() => fileCtrl.toggleImportSelection(i)}>
                                   <div className={`p-1 rounded ${ui.selectedImportIndices.includes(i) ? 'text-blue-500' : 'text-slate-600'}`}>
                                       {ui.selectedImportIndices.includes(i) ? <CheckSquare size={20}/> : <Square size={20}/>}
                                   </div>
                                   <div className="overflow-hidden flex-1">
                                       <div className="flex justify-between items-start">
                                           <p className="text-xs font-bold text-white truncate">{c.name || 'Sem Nome'}</p>
                                           {c.principal && (<span className="text-[10px] font-black text-emerald-500 bg-emerald-950/30 px-1.5 py-0.5 rounded flex items-center gap-1"><Banknote size={10}/> {formatMoney(c.principal)}</span>)}
                                       </div>
                                       <p className="text-[10px] text-slate-500 truncate">{c.phone} {c.document ? `• ${c.document}` : ''}</p>
                                   </div>
                               </div>
                           ))}
                       </div>
                       <button onClick={() => fileCtrl.handleConfirmImport(activeUser, fetchFullData)} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl uppercase shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={ui.selectedImportIndices.length === 0}>
                           Confirmar Importação
                       </button>
                   </div>
               </Modal>
            );

        default: return null;
    }
};
