
import React from 'react';
import { useModal } from '../../../contexts/ModalContext';
import { Modal } from '../../ui/Modal';
import { AdminModals } from '../ModalGroups';
import { ConfirmationModalWrapper, ReceiptModalWrapper, MessageHubWrapper, DonateModalWrapper, AgendaWrapper, FlowWrapper, CalculatorWrapper, AIWrapper, NoteWrapper } from '../ModalWrappers';
import { RenegotiationModal } from '../../../features/agreements/components/RenegotiationModal';
import { CheckSquare, Square, Banknote, AlertTriangle, Loader2, Calendar, Percent, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
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
               <Modal onClose={closeModal} title="Selecione a Planilha">
                   <div className="space-y-3">
                       <div className="bg-blue-900/20 p-4 rounded-2xl border border-blue-500/30 flex items-start gap-3 mb-4">
                           <Info className="text-blue-400 shrink-0" size={20}/>
                           <p className="text-xs text-blue-200">Detectamos múltiplas abas no seu arquivo. Escolha qual contém os dados dos clientes.</p>
                       </div>
                       <div className="grid grid-cols-1 gap-2">
                           {ui.importSheetNames.map((sheet: string) => (
                               <button key={sheet} onClick={() => fileCtrl.selectSheet(sheet)} className="w-full p-5 bg-slate-950 border border-slate-800 rounded-2xl text-left hover:border-blue-500 hover:bg-slate-900 transition-all font-black uppercase text-xs text-white flex justify-between items-center group">
                                   {sheet}
                                   <Calendar className="text-slate-700 group-hover:text-blue-500" size={16}/>
                               </button>
                           ))}
                       </div>
                   </div>
               </Modal>
            );

        case 'IMPORT_PREVIEW':
            return (
               <Modal onClose={fileCtrl.cancelImport} title="Curadoria de Importação">
                   <div className="space-y-6">
                       <div className="flex justify-between items-center">
                           <div className="flex gap-4">
                               <div className="text-center">
                                   <p className="text-[10px] font-black uppercase text-slate-500">Total Detectado</p>
                                   <p className="text-lg font-black text-white">{ui.importCandidates.length}</p>
                               </div>
                               <div className="text-center">
                                   <p className="text-[10px] font-black uppercase text-blue-500">Selecionados</p>
                                   <p className="text-lg font-black text-blue-400">{ui.selectedImportIndices.length}</p>
                               </div>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => ui.setSelectedImportIndices(ui.importCandidates.map((_:any, i:number) => i).filter((i:number) => ui.importCandidates[i].status === 'VALID'))} className="text-[9px] font-black uppercase text-blue-500 hover:text-white">Marcar Todos Válidos</button>
                               <span className="text-slate-800">|</span>
                               <button onClick={() => ui.setSelectedImportIndices([])} className="text-[9px] font-black uppercase text-slate-500 hover:text-white">Desmarcar</button>
                           </div>
                       </div>

                       <div className="bg-slate-950 border border-slate-800 rounded-[2rem] overflow-hidden">
                           <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                               {ui.importCandidates.map((c: any, i: number) => {
                                   const isSelected = ui.selectedImportIndices.includes(i);
                                   const isInvalid = c.status === 'INVALID';
                                   
                                   return (
                                       <div key={i} 
                                            className={`flex items-start gap-4 p-4 border-b border-slate-900 last:border-0 hover:bg-slate-900/50 transition-colors cursor-pointer ${isInvalid ? 'opacity-50 grayscale' : ''}`} 
                                            onClick={() => fileCtrl.toggleImportSelection(i)}
                                       >
                                           <div className={`mt-1 p-0.5 rounded transition-colors ${isSelected ? 'text-blue-500' : 'text-slate-700'}`}>
                                               {isSelected ? <CheckSquare size={22}/> : <Square size={22}/>}
                                           </div>
                                           <div className="flex-1 min-w-0">
                                               <div className="flex justify-between items-start gap-2">
                                                   <h4 className="text-sm font-black text-white uppercase truncate">{c.name || 'Sem Nome'}</h4>
                                                   {isInvalid ? (
                                                       <span className="shrink-0 flex items-center gap-1 text-[8px] font-black uppercase bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded border border-rose-500/20">
                                                           <AlertCircle size={10}/> {c.error}
                                                       </span>
                                                   ) : (
                                                       <span className="shrink-0 flex items-center gap-1 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">
                                                           <CheckCircle2 size={10}/> Pronto
                                                       </span>
                                                   )}
                                               </div>
                                               <p className="text-[10px] text-slate-500 font-bold mb-3">{c.phone || 'Sem Telefone'} {c.document ? `• ${c.document}` : ''}</p>
                                               
                                               {/* Resumo Financeiro Curado */}
                                               <div className="grid grid-cols-3 gap-2">
                                                   <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                                                       <p className="text-[8px] font-black text-slate-600 uppercase mb-0.5">Capital</p>
                                                       <p className="text-[10px] font-bold text-white truncate">{c.principal ? formatMoney(c.principal) : '-'}</p>
                                                   </div>
                                                   <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                                                       <p className="text-[8px] font-black text-slate-600 uppercase mb-0.5">Taxa</p>
                                                       <p className="text-[10px] font-bold text-emerald-500">{c.interestRate ? `${c.interestRate}%` : '-'}</p>
                                                   </div>
                                                   <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                                                       <p className="text-[8px] font-black text-slate-600 uppercase mb-0.5">Início</p>
                                                       <p className="text-[10px] font-bold text-blue-400">{c.startDate ? new Date(c.startDate).toLocaleDateString() : '-'}</p>
                                                   </div>
                                               </div>
                                           </div>
                                       </div>
                                   );
                               })}
                           </div>
                       </div>

                       <div className="bg-amber-900/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
                           <AlertTriangle className="text-amber-500 shrink-0" size={18}/>
                           <p className="text-[10px] text-amber-200/80 leading-relaxed font-medium uppercase">
                               <b>Curadoria:</b> Contratos com Capital serão gerados automaticamente na <b>Carteira Principal</b> com vencimento para 30 dias após a data de início.
                           </p>
                       </div>

                       <button 
                           onClick={() => fileCtrl.handleConfirmImport(activeUser, fetchFullData)} 
                           className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
                           disabled={ui.selectedImportIndices.length === 0}
                       >
                           {ui.selectedImportIndices.length > 0 ? (
                               <><Banknote size={18}/> Importar {ui.selectedImportIndices.length} Registros</>
                           ) : 'Selecione registros para importar'}
                       </button>
                   </div>
               </Modal>
            );

        default: return null;
    }
};
