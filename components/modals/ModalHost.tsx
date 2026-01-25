
import React from 'react';
import { Loan, CapitalSource, Client, UserProfile } from '../../types';
import { LoanForm } from '../LoanForm';
import { Modal } from '../ui/Modal';
import { PaymentManagerModal } from './PaymentManagerModal';
import { CalculatorModal } from './CalculatorModal';
import { AgendaModal } from './AgendaModal';
import { FlowModal } from './FlowModal';
import { ReceiptModal } from './ReceiptModal';
import { MessageHubModal } from './MessageHubModal';
import { Loader2, Search, FileSpreadsheet, Copy, BookUser, CheckSquare, Square, Banknote, ChevronRight, Hash, KeyRound } from 'lucide-react';
import { maskPhone, maskDocument, formatMoney } from '../../utils/formatters';
import { calculateTotalDue } from '../../domain/finance/calculations';

interface ModalHostProps {
  // ... (prop types unchanged)
  isFormOpen: boolean;
  isClientModalOpen: boolean;
  isSourceModalOpen: boolean;
  isAddFundsModalOpen: CapitalSource | null;
  paymentModal: any;
  withdrawModal: boolean;
  noteModalLoan: Loan | null;
  confirmation: any;
  donateModal: boolean;
  deleteAccountModal: boolean;
  resetDataModal: boolean;
  showCalcModal: boolean;
  showAgendaModal: boolean;
  showFlowModal: boolean;
  showReceipt: any;
  messageModalLoan: Loan | null;
  viewProofModal: string | null;
  masterEditUser: any;
  
  editingLoan: Loan | null;
  clients: Client[];
  sources: CapitalSource[];
  activeUser: UserProfile | null;
  loans: Loan[];
  editingClient: Client | null;
  clientForm: any;
  clientDraftAccessCode: string;
  clientDraftNumber: string;
  sourceForm: any;
  addFundsValue: string;
  withdrawValue: string;
  withdrawSourceId: string;
  noteText: string;
  refundChecked: boolean;
  deleteAccountAgree: boolean;
  deleteAccountConfirm: string;
  resetPasswordInput: string;
  isSaving: boolean;
  isProcessingPayment: boolean;
  paymentType: 'FULL' | 'RENEW_INTEREST' | 'RENEW_AV';
  avAmount: string;

  showImportPreviewModal: boolean;
  importCandidates: any[];
  selectedImportIndices: number[];
  
  // Sheet Selection
  showSheetSelectModal: boolean;
  importSheetNames: string[];
  setShowSheetSelectModal: (v: boolean) => void;

  isBulkDeleteMode: boolean;
  selectedClientsToDelete: string[];

  onCloseForm: () => void;
  onSaveLoan: (loan: Loan) => void;
  onCloseClientModal: () => void;
  setClientForm: (val: any) => void;
  onPickContact: () => void;
  onSaveClient: () => void;
  onCloseSourceModal: () => void;
  setSourceForm: (val: any) => void;
  onSaveSource: () => void;
  onClosePaymentModal: () => void;
  setPaymentType: (t: any) => void;
  setAvAmount: (v: string) => void;
  onConfirmPayment: (forgive: boolean) => void;
  onOpenMessageFromPayment: (loan: Loan) => void;
  onCloseAddFunds: () => void;
  setAddFundsValue: (v: string) => void;
  onConfirmAddFunds: () => void;
  onCloseWithdraw: () => void;
  setWithdrawValue: (v: string) => void;
  setWithdrawSourceId: (v: string) => void;
  onConfirmWithdraw: () => void;
  onCloseNote: () => void;
  setNoteText: (v: string) => void;
  onSaveNote: () => void;
  onCloseConfirmation: () => void;
  setRefundChecked: (v: boolean) => void;
  onExecuteConfirmation: () => void;
  onCloseDonate: () => void;
  showToast: (msg: string, type?: 'success') => void;
  onCloseDeleteAccount: () => void;
  setDeleteAccountAgree: (v: boolean) => void;
  setDeleteAccountConfirm: (v: string) => void;
  onExecuteDeleteAccount: () => void;
  onCloseResetData: () => void;
  setResetPasswordInput: (v: string) => void;
  onExecuteResetData: () => void;
  onCloseCalc: () => void;
  onCloseAgenda: () => void;
  onSelectLoanFromAgenda: (id: string) => void;
  onCloseFlow: () => void;
  onCloseReceipt: () => void;
  onCloseMessage: () => void;
  onCloseProof: () => void;
  onCloseMasterEdit: () => void;
  setMasterEditUser: (u: any) => void;
  onSaveMasterEdit: () => void;
  
  onCloseImportPreview: () => void;
  toggleImportSelection: (index: number) => void;
  onConfirmImportSelection: () => void;
  
  // Controllers
  fileCtrl: any;

  clientPhotoInputRef: React.RefObject<HTMLInputElement>;
  promissoriaFileInputRef: React.RefObject<HTMLInputElement>;
  extraDocFileInputRef: React.RefObject<HTMLInputElement>;
  
  setPaymentModal: (val: any) => void;
  setViewProofModal: (val: string | null) => void;
  setEditingLoan: (l: Loan | null) => void;
  setIsFormOpen: (v: boolean) => void;
}

export const ModalHost: React.FC<ModalHostProps> = (props) => {
  const pixCopiaCola = "00020126580014br.gov.bcb.pix0136d8135204-13f6-483b-90c9-fb530257d7b55204000053039865802BR5925MANOEL SOCRATES COSTA LEV6011Itacoatiara6211050726f78796304E08B";
  const canImportContacts = 'contacts' in navigator && 'ContactsManager' in window;

  const handleSystemAction = (type: string, meta: any) => {
      props.onCloseAgenda();
      if (type === 'PAYMENT' && meta?.loanId && meta?.installmentId) {
          const loan = props.loans.find(l => l.id === meta.loanId);
          if (loan) {
              const inst = loan.installments.find(i => i.id === meta.installmentId);
              if (inst) {
                  const calcs = calculateTotalDue(loan, inst);
                  props.setPaymentModal({ loan, inst, calculations: calcs });
              }
          }
      } 
      else if (type === 'PORTAL_REVIEW' && meta?.comprovanteUrl) {
          props.setViewProofModal(meta.comprovanteUrl);
      }
  };

  return (
    <>
       {props.isFormOpen && <LoanForm onAdd={props.onSaveLoan} onCancel={props.onCloseForm} initialData={props.editingLoan} clients={props.clients} sources={props.sources} userProfile={props.activeUser} />}
       
       {props.isClientModalOpen && (
           <Modal onClose={props.onCloseClientModal} title={props.editingClient ? 'Editar Cliente' : 'Novo Cliente'}>
               <div className="space-y-3">
                   <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12">
                            <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Nome Completo</label>
                            <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={props.clientForm.name} onChange={e => props.setClientForm({...props.clientForm, name: e.target.value})} />
                        </div>
                        <div className="col-span-6">
                            <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Telefone</label>
                            <div className="flex gap-1">
                                <input type="tel" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={props.clientForm.phone} onChange={e => props.setClientForm({...props.clientForm, phone: maskPhone(e.target.value)})} />
                                {canImportContacts && (
                                    <button onClick={props.onPickContact} className="px-3 bg-slate-900 border border-slate-800 rounded-xl text-blue-400 hover:text-white hover:bg-blue-600 transition-all" title="Importar da Agenda"><BookUser size={20}/></button>
                                )}
                            </div>
                        </div>
                        <div className="col-span-6">
                            <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">CPF / CNPJ</label>
                            <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={props.clientForm.document} onChange={e => props.setClientForm({...props.clientForm, document: maskDocument(e.target.value)})} />
                        </div>

                        {/* CAMPOS AUTOMÁTICOS EM DESTAQUE */}
                        <div className="col-span-6">
                            <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 flex items-center gap-1"><KeyRound size={12}/> Código de Acesso</label>
                            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-emerald-500 font-black text-center text-sm tracking-widest select-all">
                                {props.editingClient ? (props.editingClient as any).access_code : props.clientDraftAccessCode}
                            </div>
                        </div>
                        <div className="col-span-6">
                            <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 flex items-center gap-1"><Hash size={12}/> Nº do Cliente</label>
                            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-blue-500 font-black text-center text-sm tracking-widest select-all">
                                {props.editingClient ? (props.editingClient as any).client_number : props.clientDraftNumber}
                            </div>
                        </div>

                        <div className="col-span-12">
                            <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">E-mail (Opcional)</label>
                            <input type="email" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={props.clientForm.email} onChange={e => props.setClientForm({...props.clientForm, email: e.target.value})} />
                        </div>
                        <div className="col-span-12">
                            <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Endereço Completo</label>
                            <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={props.clientForm.address} onChange={e => props.setClientForm({...props.clientForm, address: e.target.value})} />
                        </div>
                        <div className="col-span-8">
                            <input type="text" placeholder="Cidade" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={props.clientForm.city} onChange={e => props.setClientForm({...props.clientForm, city: e.target.value})} />
                        </div>
                        <div className="col-span-4">
                            <input type="text" placeholder="UF" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm uppercase" maxLength={2} value={props.clientForm.state || ''} onChange={e => props.setClientForm({...props.clientForm, state: e.target.value.toUpperCase()})} />
                        </div>
                   </div>
                   <textarea placeholder="Anotações internas..." className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none h-20 text-sm resize-none" value={props.clientForm.notes} onChange={e => props.setClientForm({...props.clientForm, notes: e.target.value})} />
                   <button onClick={props.onSaveClient} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl uppercase shadow-lg flex items-center justify-center gap-2 text-sm">{props.isSaving ? <Loader2 className="animate-spin"/> : 'Salvar Cliente'}</button>
               </div>
           </Modal>
       )}

       {props.showSheetSelectModal && (
           <Modal onClose={() => props.setShowSheetSelectModal(false)} title="Selecione a Aba">
               <div className="space-y-2">
                   <p className="text-slate-400 text-sm mb-4">O arquivo possui múltiplas planilhas. Qual deseja importar?</p>
                   {props.importSheetNames.map(sheet => (
                       <button 
                           key={sheet} 
                           onClick={() => props.fileCtrl.selectSheet(sheet)}
                           className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-blue-500 hover:text-blue-400 transition-all font-bold text-white flex justify-between items-center"
                       >
                           {sheet}
                           <ChevronRight size={16} />
                       </button>
                   ))}
               </div>
           </Modal>
       )}

       {props.showImportPreviewModal && (
           <Modal onClose={props.onCloseImportPreview} title="Selecionar Dados">
               <div className="space-y-4">
                   <p className="text-slate-400 text-xs">Foram encontrados {props.importCandidates.length} registros. Selecione quais deseja importar para sua base.</p>
                   
                   <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-[300px] overflow-y-auto custom-scrollbar">
                       {props.importCandidates.map((c, i) => (
                           <div key={i} className="flex items-center gap-3 p-3 border-b border-slate-800 last:border-0 hover:bg-slate-900 transition-colors cursor-pointer" onClick={() => props.toggleImportSelection(i)}>
                               <div className={`p-1 rounded ${props.selectedImportIndices.includes(i) ? 'text-blue-500' : 'text-slate-600'}`}>
                                   {props.selectedImportIndices.includes(i) ? <CheckSquare size={20}/> : <Square size={20}/>}
                               </div>
                               <div className="overflow-hidden flex-1">
                                   <div className="flex justify-between items-start">
                                       <p className="text-xs font-bold text-white truncate">{c.name || 'Sem Nome'}</p>
                                       {c.principal && (
                                           <span className="text-[10px] font-black text-emerald-500 bg-emerald-950/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                               <Banknote size={10}/> {formatMoney(c.principal)}
                                           </span>
                                       )}
                                   </div>
                                   <p className="text-[10px] text-slate-500 truncate">
                                       {c.phone} {c.document ? `• ${c.document}` : ''}
                                   </p>
                                   {c.startDate && <p className="text-[9px] text-slate-600">Início: {new Date(c.startDate).toLocaleDateString()}</p>}
                               </div>
                           </div>
                       ))}
                   </div>

                   <div className="flex gap-2 justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-blue-400 pl-2">{props.selectedImportIndices.length} selecionados</span>
                        <div className="flex gap-2">
                            <button onClick={() => props.selectedImportIndices.length === props.importCandidates.length ? props.importCandidates.forEach((_, i) => props.toggleImportSelection(i)) : props.importCandidates.forEach((_, i) => !props.selectedImportIndices.includes(i) && props.toggleImportSelection(i))} className="text-[10px] text-slate-500 hover:text-white px-2 uppercase font-bold">Inverter / Todos</button>
                        </div>
                   </div>

                   <button onClick={props.onConfirmImportSelection} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl uppercase shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={props.selectedImportIndices.length === 0}>
                       Confirmar Importação
                   </button>
               </div>
           </Modal>
       )}

       {props.isSourceModalOpen && (
           <Modal onClose={props.onCloseSourceModal} title="Nova Fonte de Capital">
               <div className="space-y-4">
                   <input type="text" placeholder="Nome da Fonte (ex: Nubank)" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={props.sourceForm.name} onChange={e => props.setSourceForm({...props.sourceForm, name: e.target.value})} />
                   <select className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={props.sourceForm.type} onChange={e => props.setSourceForm({...props.sourceForm, type: e.target.value})}>
                       <option value="BANK">Banco / Conta Digital</option><option value="CASH">Dinheiro em Espécie</option><option value="WALLET">Carteira Física</option><option value="CARD">Cartão de Crédito</option>
                   </select>
                   <input type="number" placeholder="Saldo Inicial (R$)" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={props.sourceForm.balance} onChange={e => props.setSourceForm({...props.sourceForm, balance: e.target.value})} />
                   <button onClick={props.onSaveSource} disabled={props.isSaving} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl uppercase">{props.isSaving ? <Loader2 className="animate-spin"/> : 'Criar Fonte'}</button>
               </div>
           </Modal>
       )}

       {/* ... (rest of the file remains unchanged) */}
       {props.paymentModal && (
           <PaymentManagerModal 
               data={props.paymentModal} 
               onClose={props.onClosePaymentModal} 
               isProcessing={props.isProcessingPayment} 
               paymentType={props.paymentType} 
               setPaymentType={props.setPaymentType} 
               avAmount={props.avAmount} 
               setAvAmount={props.setAvAmount} 
               onConfirm={props.onConfirmPayment} 
               onOpenMessage={props.onOpenMessageFromPayment} 
           />
       )}

       {/* ... (outros modais mantidos) ... */}
       {props.withdrawModal && props.activeUser && (
           <Modal onClose={props.onCloseWithdraw} title="Resgatar Lucros">
               <div className="space-y-4">
                   <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-xs text-slate-500 uppercase font-bold">Disponível para Saque</p><p className="text-2xl font-black text-emerald-400">R$ {props.activeUser.interestBalance.toFixed(2)}</p></div>
                   <input type="number" placeholder="Valor do Resgate" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={props.withdrawValue} onChange={e => props.setWithdrawValue(e.target.value)} />
                   <select className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={props.withdrawSourceId} onChange={e => props.setWithdrawSourceId(e.target.value)}>
                       <option value="">Selecione o destino do valor...</option>
                       <option value="EXTERNAL_WITHDRAWAL">Saque Externo (Para mim)</option>
                       {props.sources.map(s => <option key={s.id} value={s.id}>Reinvestir em: {s.name}</option>)}
                   </select>
                   <button onClick={props.onConfirmWithdraw} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl uppercase">Confirmar Resgate</button>
               </div>
           </Modal>
       )}

       {/* Recibo com Nome da Empresa */}
       {props.showReceipt && props.activeUser && (
           <ReceiptModal 
               data={props.showReceipt} 
               onClose={props.onCloseReceipt} 
               userName={props.activeUser.businessName || props.activeUser.name || 'Empresa'} 
               userDoc={props.activeUser.document} 
           />
       )}

       {/* ... (outros modais mantidos) ... */}
       {props.noteModalLoan && (
           <Modal onClose={props.onCloseNote} title="Anotações do Contrato">
               <div className="space-y-4">
                   <textarea className="w-full h-40 bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800 resize-none" placeholder="Escreva observações aqui..." value={props.noteText} onChange={e => props.setNoteText(e.target.value)}></textarea>
                   <button onClick={props.onSaveNote} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl uppercase">Salvar Anotação</button>
               </div>
           </Modal>
       )}
       {props.confirmation && (
           <Modal onClose={props.onCloseConfirmation} title="Confirmação">
               <div className="space-y-4 text-center">
                   <p className="text-white text-lg font-bold">{props.confirmation.title || 'Tem certeza?'}</p>
                   <p className="text-slate-400 text-sm">{props.confirmation.message || 'Essa ação não pode ser desfeita facilmente.'}</p>
                   {props.confirmation.showRefundOption && (
                       <div className="flex items-center justify-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                           <input type="checkbox" id="refundCheck" checked={props.refundChecked} onChange={e => props.setRefundChecked(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
                           <label htmlFor="refundCheck" className="text-sm text-slate-300 font-bold select-none">Devolver capital para a Fonte?</label>
                       </div>
                   )}
                   <div className="flex gap-4 pt-2">
                       <button onClick={props.onCloseConfirmation} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase">Cancelar</button>
                       <button onClick={props.onExecuteConfirmation} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase">Confirmar</button>
                   </div>
               </div>
           </Modal>
       )}
       {props.donateModal && (
           <Modal onClose={props.onCloseDonate} title="Apoiar o Projeto">
               <div className="space-y-6 text-center">
                   <div className="bg-emerald-950/30 p-4 rounded-2xl border border-emerald-500/30">
                       <p className="text-emerald-400 font-bold uppercase text-xs tracking-widest mb-2">Pix Copia e Cola</p>
                       <p className="text-white text-sm font-medium mb-4">Seu apoio ajuda a manter o CapitalFlow evoluindo!</p>
                       <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative group cursor-pointer" onClick={() => { navigator.clipboard.writeText(pixCopiaCola); props.showToast('Código Pix copiado!', 'success'); }}>
                           <p className="text-[10px] text-slate-400 font-mono break-all line-clamp-4 hover:line-clamp-none transition-all">{pixCopiaCola}</p>
                           <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                               <span className="text-white font-bold text-xs flex items-center gap-2"><Copy size={14}/> Copiar</span>
                           </div>
                       </div>
                   </div>
                   <button onClick={() => { navigator.clipboard.writeText(pixCopiaCola); props.showToast('Código Pix copiado!', 'success'); }} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all">
                       <Copy size={18}/> Copiar Chave Pix
                   </button>
               </div>
           </Modal>
       )}
       {props.deleteAccountModal && (
           <Modal onClose={props.onCloseDeleteAccount} title="EXCLUIR CONTA PERMANENTEMENTE">
               <div className="space-y-4">
                   <div className="bg-rose-950/30 p-4 rounded-xl border border-rose-500/30 text-rose-200 text-sm font-bold text-center">ATENÇÃO: Esta ação apagará TODOS os seus dados, clientes, contratos e histórico. Não há volta.</div>
                   <div className="flex items-center gap-3"><input type="checkbox" checked={props.deleteAccountAgree} onChange={e => props.setDeleteAccountAgree(e.target.checked)} className="w-6 h-6 accent-rose-600" /><span className="text-white text-sm">Eu entendo que perderei tudo.</span></div>
                   <input type="text" placeholder="Digite DELETAR para confirmar" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={props.deleteAccountConfirm} onChange={e => props.setDeleteAccountConfirm(e.target.value)} />
                   <button onClick={props.onExecuteDeleteAccount} disabled={!props.deleteAccountAgree || props.deleteAccountConfirm !== 'DELETAR'} className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl uppercase disabled:opacity-50">Excluir Tudo</button>
               </div>
           </Modal>
       )}
       {props.resetDataModal && props.activeUser && (
           <Modal onClose={props.onCloseResetData} title="Zerar Dados (Reset)">
               <div className="space-y-4">
                   <p className="text-slate-400 text-sm">Isso apagará clientes, contratos e histórico, mas manterá sua conta e senha. O capital será zerado.</p>
                   {props.activeUser.id !== 'DEMO' && <input type="password" placeholder="Sua senha atual" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={props.resetPasswordInput} onChange={e => props.setResetPasswordInput(e.target.value)} />}
                   <button onClick={props.onExecuteResetData} className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl uppercase">Confirmar Reset</button>
               </div>
           </Modal>
       )}
       {props.showCalcModal && <CalculatorModal onClose={props.onCloseCalc} />}
       {props.showAgendaModal && <AgendaModal onClose={props.onCloseAgenda} activeUser={props.activeUser} onSystemAction={handleSystemAction} />}
       {props.showFlowModal && props.activeUser && <FlowModal onClose={props.onCloseFlow} loans={props.loans} profit={props.activeUser.interestBalance} />}
       {props.messageModalLoan && <MessageHubModal loan={props.messageModalLoan} client={props.clients.find(c => c.id === props.messageModalLoan?.clientId)} onClose={props.onCloseMessage} />}
       {props.viewProofModal && (<Modal onClose={props.onCloseProof} title="Comprovante"><img src={props.viewProofModal} alt="Comprovante" className="w-full h-auto rounded-xl" /></Modal>)}
       {props.isAddFundsModalOpen && (
           <Modal onClose={props.onCloseAddFunds} title={`Adicionar Fundos: ${props.isAddFundsModalOpen.name}`}>
               <div className="space-y-4">
                   <input type="number" placeholder="Valor a adicionar (R$)" className="w-full bg-slate-950 p-4 rounded-xl text-white text-xl font-bold outline-none border border-slate-800" value={props.addFundsValue} onChange={e => props.setAddFundsValue(e.target.value)} />
                   <button onClick={props.onConfirmAddFunds} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl uppercase">Confirmar Aporte</button>
               </div>
           </Modal>
       )}
       {props.masterEditUser && (
           <Modal onClose={props.onCloseMasterEdit} title={`Editar Usuário: ${props.masterEditUser.nome_operador}`}>
               <div className="space-y-4">
                   <input type="text" placeholder="Nome" value={props.masterEditUser.nome_operador} onChange={e => props.setMasterEditUser({...props.masterEditUser, nome_operador: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none"/>
                   <input type="text" placeholder="Empresa" value={props.masterEditUser.nome_empresa} onChange={e => props.setMasterEditUser({...props.masterEditUser, nome_empresa: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none"/>
                   <input type="text" placeholder="PIX" value={props.masterEditUser.pix_key || ''} onChange={e => props.setMasterEditUser({...props.masterEditUser, pix_key: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none"/>
                   <input type="password" placeholder="Nova Senha (deixe em branco p/ manter)" value={props.masterEditUser.newPassword || ''} onChange={e => props.setMasterEditUser({...props.masterEditUser, newPassword: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none"/>
                   <button onClick={props.onSaveMasterEdit} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold uppercase">Salvar</button>
               </div>
           </Modal>
       )}
    </>
  );
};
