
import React from 'react';
import { useModal } from '../../../contexts/ModalContext';
import { Modal } from '../../ui/Modal';
import { AdminModals } from '../ModalGroups';
import { ConfirmationModalWrapper, ReceiptModalWrapper, MessageHubWrapper, DonateModalWrapper, AgendaWrapper, FlowWrapper, CalculatorWrapper, AIWrapper, NoteWrapper } from '../ModalWrappers';
import { RenegotiationModal } from '../../../features/agreements/components/RenegotiationModal';
import { CheckSquare, Square, Banknote, AlertTriangle, Loader2 } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { calculateTotalDue } from '../../../domain/finance/calculations';

export const SystemModalsWrapper = () => {
    const { activeModal, closeModal, ui, activeUser, fileCtrl, showToast, fetchFullData, loanCtrl, profileCtrl, loans, isLoadingData } = useModal();

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
               <Modal onClose={closeModal} title="EXCLUSÃO DE CONTA">
                   <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                       <div className="bg-rose-950/30 p-5 rounded-2xl border border-rose-500/30 text-rose-200 text-sm font-medium text-center flex flex-col items-center gap-2">
                           <AlertTriangle size={32} className="text-rose-500 mb-1"/>
                           <p className="font-bold uppercase text-xs tracking-widest">Ação Irreversível</p>
                           <p className="text-xs opacity-80">Você está prestes a apagar sua conta e todos os dados associados permanentemente.</p>
                       </div>
                       
                       <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                           <label className="flex items-start gap-3 cursor-pointer group">
                               <div className="relative flex items-center">
                                   <input type="checkbox" checked={ui.deleteAccountAgree} onChange={e => ui.setDeleteAccountAgree(e.target.checked)} className="peer w-5 h-5 appearance-none border-2 border-slate-600 rounded bg-slate-900 checked:bg-rose-600 checked:border-rose-600 transition-all cursor-pointer" />
                                   <CheckSquare size={14} className="absolute left-0.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"/>
                               </div>
                               <span className="text-xs text-slate-300 group-hover:text-white transition-colors select-none leading-tight pt-0.5">
                                   Li e aceito os termos: Entendo que perderei o acesso imediato e todos os meus dados serão destruídos sem possibilidade de recuperação.
                               </span>
                           </label>
                       </div>

                       <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Confirmação de Segurança</label>
                           <input 
                                type="text" 
                                placeholder="Digite DELETAR para confirmar" 
                                className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800 focus:border-rose-500 transition-all font-bold placeholder:font-normal" 
                                value={ui.deleteAccountConfirm} 
                                onChange={e => ui.setDeleteAccountConfirm(e.target.value)} 
                           />
                       </div>

                       <button 
                            onClick={async () => { if(ui.deleteAccountAgree && ui.deleteAccountConfirm === 'DELETAR') { await profileCtrl.handleDeleteAccount(); } }} 
                            disabled={!ui.deleteAccountAgree || ui.deleteAccountConfirm !== 'DELETAR' || isLoadingData} 
                            className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2"
                        >
                            {isLoadingData ? <Loader2 className="animate-spin" size={18}/> : 'Confirmar Exclusão Total'}
                       </button>
                   </div>
               </Modal>
            );
        case 'RESET_DATA':
            return activeUser ? (
               <Modal onClose={closeModal} title="Zerar Dados">
                   <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                       <div className="bg-amber-950/30 p-4 rounded-2xl border border-amber-500/30 flex items-center gap-3">
                           <AlertTriangle className="text-amber-500 flex-shrink-0" size={24}/>
                           <div className="text-amber-200 text-xs">
                               <p className="font-bold uppercase mb-1">Limpeza de Base</p>
                               <p className="leading-tight opacity-90">Isso apagará TODOS os clientes, contratos e histórico financeiro. Sua conta e login permanecerão ativos.</p>
                           </div>
                       </div>

                       {activeUser.id !== 'DEMO' && (
                           <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Senha Atual</label>
                               <input 
                                    type="password" 
                                    placeholder="Digite sua senha para confirmar" 
                                    className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800 focus:border-amber-500 transition-all" 
                                    value={ui.resetPasswordInput} 
                                    onChange={e => ui.setResetPasswordInput(e.target.value)} 
                               />
                           </div>
                       )}
                       
                       <div className="flex gap-3">
                           <button onClick={closeModal} disabled={isLoadingData} className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-xl uppercase text-xs disabled:opacity-50">Cancelar</button>
                           <button 
                                onClick={profileCtrl.executeResetData} 
                                disabled={(activeUser.id !== 'DEMO' && !ui.resetPasswordInput) || isLoadingData}
                                className="flex-[2] py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl uppercase transition-all shadow-lg shadow-rose-900/20 text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                               {isLoadingData ? <Loader2 className="animate-spin" size={18}/> : 'Confirmar Reset'}
                           </button>
                       </div>
                   </div>
               </Modal>
            ) : null;
        case 'AGENDA':
            const handleSystemAction = (type: string, meta: any) => {
                ui.closeModal(); 
                
                if (type === 'PAYMENT' && meta?.loanId && meta?.installmentId) {
                    const loan = loans.find(l => l.id === meta.loanId);
                    if (loan) {
                        const inst = loan.installments.find(i => i.id === meta.installmentId);
                        if (inst) {
                            const calcs = calculateTotalDue(loan, inst);
                            setTimeout(() => {
                                ui.setPaymentModal({ loan, inst, calculations: calcs });
                                ui.openModal('PAYMENT');
                            }, 150); 
                        } else {
                            showToast("Parcela não encontrada ou já paga.", "info");
                        }
                    } else {
                        showToast("Contrato não encontrado.", "error");
                    }
                } else if (type === 'PORTAL_REVIEW' && meta?.comprovanteUrl) {
                    setTimeout(() => ui.openModal('PROOF_VIEW', meta.comprovanteUrl), 150);
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
