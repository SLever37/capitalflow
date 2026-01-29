
import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import { Modal } from '../ui/Modal';
import { PaymentManagerModal } from './PaymentManagerModal';
import { CalculatorModal } from './CalculatorModal';
import { AgendaModal } from './AgendaModal';
import { FlowModal } from './FlowModal';
import { ReceiptModal } from './ReceiptModal';
import { MessageHubModal } from './MessageHubModal';
import { AIAssistantModal } from './AIAssistantModal';
import { NoteWrapper } from './ModalWrappers'; 
import { Copy, KeyRound, User, Camera } from 'lucide-react';
import { maskPhone, maskDocument } from '../../utils/formatters';

// --- MODAIS DO CLIENTE ---
export const ClientModals = () => {
    const { activeModal, closeModal, ui, clientCtrl } = useModal();
    const { clientForm, editingClient } = ui;
    const canImportContacts = 'contacts' in navigator && 'ContactsManager' in window;

    if (activeModal?.type !== 'CLIENT_FORM') return null;

    return (
       <Modal onClose={closeModal} title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}>
           <div className="space-y-4">
               {/* Avatar Upload Area */}
               <div className="flex justify-center mb-2">
                   <div 
                        className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer group"
                        onClick={() => editingClient && ui.clientAvatarInputRef.current?.click()}
                   >
                       {clientForm.fotoUrl ? (
                           <img src={clientForm.fotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                       ) : (
                           <User size={40} className="text-slate-500" />
                       )}
                       
                       {editingClient && (
                           <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <Camera className="text-white" size={20} />
                           </div>
                       )}
                   </div>
               </div>
               
               {/* Hidden File Input */}
               <input 
                   type="file" 
                   ref={ui.clientAvatarInputRef} 
                   className="hidden" 
                   accept="image/*" 
                   onChange={clientCtrl.handleAvatarUpload}
               />
               
               {!editingClient && (
                   <p className="text-center text-[10px] text-slate-500 italic">Salve o cliente para adicionar uma foto.</p>
               )}

               <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Nome Completo</label>
                        <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={clientForm.name} onChange={e => ui.setClientForm({...clientForm, name: e.target.value})} />
                    </div>
                    <div className="col-span-6">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Telefone</label>
                        <div className="flex gap-1">
                            <input type="tel" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={clientForm.phone} onChange={e => ui.setClientForm({...clientForm, phone: maskPhone(e.target.value)})} />
                            {canImportContacts && (
                                <button onClick={clientCtrl.handlePickContact} className="px-3 bg-slate-900 border border-slate-800 rounded-xl text-blue-400 hover:text-white hover:bg-blue-600 transition-all" title="Importar da Agenda"><User size={20}/></button>
                            )}
                        </div>
                    </div>
                    <div className="col-span-6">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">CPF / CNPJ</label>
                        <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={clientForm.document} onChange={e => ui.setClientForm({...clientForm, document: maskDocument(e.target.value)})} />
                    </div>

                    <div className="col-span-6">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 flex items-center gap-1"><KeyRound size={12}/> Código Acesso</label>
                        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-emerald-500 font-black text-center text-sm tracking-widest select-all">
                            {editingClient ? (editingClient as any).access_code : ui.clientDraftAccessCode}
                        </div>
                    </div>
                    <div className="col-span-6">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1">Nº Cliente</label>
                        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-blue-500 font-black text-center text-sm tracking-widest select-all">
                            {editingClient ? (editingClient as any).client_number : ui.clientDraftNumber}
                        </div>
                    </div>

                    <div className="col-span-12">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">E-mail (Opcional)</label>
                        <input type="email" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={clientForm.email} onChange={e => ui.setClientForm({...clientForm, email: e.target.value})} />
                    </div>
                    <div className="col-span-12">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Endereço Completo</label>
                        <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={clientForm.address} onChange={e => ui.setClientForm({...clientForm, address: e.target.value})} />
                    </div>
                    <div className="col-span-8">
                        <input type="text" placeholder="Cidade" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm" value={clientForm.city} onChange={e => ui.setClientForm({...clientForm, city: e.target.value})} />
                    </div>
                    <div className="col-span-4">
                        <input type="text" placeholder="UF" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm uppercase" maxLength={2} value={clientForm.state || ''} onChange={e => ui.setClientForm({...clientForm, state: e.target.value.toUpperCase()})} />
                    </div>
               </div>
               <textarea placeholder="Anotações internas..." className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none h-20 text-sm resize-none" value={clientForm.notes} onChange={e => ui.setClientForm({...clientForm, notes: e.target.value})} />
               <button onClick={clientCtrl.handleSaveClient} disabled={ui.isSaving} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl uppercase shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                   {ui.isSaving ? 'Salvando...' : 'Salvar Cliente'}
               </button>
           </div>
       </Modal>
    );
};

export const FinanceModals = () => {
    const { activeModal, closeModal, ui, sourceCtrl, paymentCtrl } = useModal();
    const { activeUser, sources } = useModal();

    return (
        <>
            {activeModal?.type === 'SOURCE_FORM' && (
                <Modal onClose={closeModal} title="Nova Fonte de Capital">
                    <div className="space-y-4">
                        <input type="text" placeholder="Nome da Fonte" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.sourceForm.name} onChange={e => ui.setSourceForm({...ui.sourceForm, name: e.target.value})} />
                        <select className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.sourceForm.type} onChange={e => ui.setSourceForm({...ui.sourceForm, type: e.target.value})}>
                            <option value="BANK">Banco / Conta Digital</option><option value="CASH">Dinheiro em Espécie</option><option value="WALLET">Carteira Física</option><option value="CARD">Cartão de Crédito</option>
                        </select>
                        <input type="text" inputMode="decimal" placeholder="Saldo Inicial (R$)" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.sourceForm.balance} onChange={e => ui.setSourceForm({...ui.sourceForm, balance: e.target.value.replace(/[^0-9.,]/g, '')})} />
                        <button onClick={sourceCtrl.handleSaveSource} disabled={ui.isSaving} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl uppercase">{ui.isSaving ? 'Salvando...' : 'Criar Fonte'}</button>
                    </div>
                </Modal>
            )}

            {activeModal?.type === 'ADD_FUNDS' && (
                <Modal onClose={closeModal} title={`Adicionar Fundos: ${activeModal.payload.name}`}>
                    <div className="space-y-4">
                        <input type="text" inputMode="decimal" placeholder="Valor (R$)" className="w-full bg-slate-950 p-4 rounded-xl text-white text-xl font-bold outline-none border border-slate-800" value={ui.addFundsValue} onChange={e => ui.setAddFundsValue(e.target.value.replace(/[^0-9.,]/g, ''))} autoFocus />
                        <button onClick={sourceCtrl.handleAddFunds} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl uppercase">Confirmar Aporte</button>
                    </div>
                </Modal>
            )}

            {activeModal?.type === 'PAYMENT' && ui.paymentModal && (
                <PaymentManagerModal data={ui.paymentModal} onClose={closeModal} isProcessing={ui.isProcessingPayment} paymentType={ui.paymentType} setPaymentType={ui.setPaymentType} avAmount={ui.avAmount} setAvAmount={ui.setAvAmount} onConfirm={paymentCtrl.handlePayment} onOpenMessage={(l: any) => { ui.setMessageModalLoan(l); ui.openModal('MESSAGE_HUB'); }} />
            )}

            {activeModal?.type === 'WITHDRAW' && activeUser && (
                <Modal onClose={closeModal} title="Resgatar Lucros">
                    <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-xs text-slate-500 uppercase font-bold">Disponível para Saque</p><p className="text-2xl font-black text-emerald-400">R$ {activeUser.interestBalance.toFixed(2)}</p></div>
                        <input type="text" inputMode="decimal" placeholder="Valor do Resgate" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.withdrawValue} onChange={e => ui.setWithdrawValue(e.target.value.replace(/[^0-9.,]/g, ''))} />
                        <select className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.withdrawSourceId} onChange={e => ui.setWithdrawSourceId(e.target.value)}>
                            <option value="">Selecione o destino...</option>
                            <option value="EXTERNAL_WITHDRAWAL">Saque Externo</option>
                            {sources.map((s: any) => <option key={s.id} value={s.id}>Reinvestir em: {s.name}</option>)}
                        </select>
                        <button onClick={sourceCtrl.handleWithdrawProfit} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl uppercase">Confirmar Resgate</button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export const SystemModals = ({ handleSystemAction }: { handleSystemAction: any }) => {
    const { activeModal, closeModal, ui, loanCtrl, activeUser, loans, clients, showToast, sources, aiCtrl } = useModal();
    const pixCopiaCola = "00020126580014br.gov.bcb.pix0136d8135204-13f6-483b-90c9-fb530257d7b55204000053039865802BR5925MANOEL SOCRATES COSTA LEV6011Itacoatiara6211050726f78796304E08B";

    return (
        <>
            {activeModal?.type === 'CONFIRMATION' && ui.confirmation && (
               <Modal onClose={closeModal} title="Confirmação">
                   <div className="space-y-4 text-center">
                       <p className="text-white text-lg font-bold">{ui.confirmation.title || 'Tem certeza?'}</p>
                       <p className="text-slate-400 text-sm">{ui.confirmation.message || 'Essa ação não pode ser desfeita facilmente.'}</p>
                       {ui.confirmation.showRefundOption && (
                           <div className="flex items-center justify-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                               <input type="checkbox" id="refundCheck" checked={ui.refundChecked} onChange={e => ui.setRefundChecked(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
                               <label htmlFor="refundCheck" className="text-sm text-slate-300 font-bold select-none">Devolver capital para a Fonte?</label>
                           </div>
                       )}
                       <div className="flex gap-4 pt-2">
                           <button onClick={closeModal} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase">Cancelar</button>
                           <button onClick={loanCtrl.executeConfirmation} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase">Confirmar</button>
                       </div>
                   </div>
               </Modal>
            )}
            {/* ... Demais Modais inalterados, mantidos por compatibilidade ... */}
            {activeModal?.type === 'DONATE' && (
                <Modal onClose={closeModal} title="Apoiar o Projeto">
                    <div className="space-y-6 text-center">
                        <div className="bg-emerald-950/30 p-4 rounded-2xl border border-emerald-500/30">
                            <p className="text-emerald-400 font-bold uppercase text-xs tracking-widest mb-2">Pix Copia e Cola</p>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative group cursor-pointer" onClick={() => { navigator.clipboard.writeText(pixCopiaCola); showToast('Código Pix copiado!', 'success'); }}>
                                <p className="text-[10px] text-slate-400 font-mono break-all line-clamp-4">{pixCopiaCola}</p>
                                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                    <span className="text-white font-bold text-xs flex items-center gap-2"><Copy size={14}/> Copiar</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
            {activeModal?.type === 'CALC' && <CalculatorModal onClose={closeModal} />}
            {activeModal?.type === 'AGENDA' && <AgendaModal onClose={closeModal} activeUser={activeUser} onSystemAction={handleSystemAction} />}
            {activeModal?.type === 'FLOW' && activeUser && <FlowModal onClose={closeModal} loans={loans} profit={activeUser.interestBalance} />}
            {activeModal?.type === 'MESSAGE_HUB' && ui.messageModalLoan && <MessageHubModal loan={ui.messageModalLoan} client={clients.find((c: any) => c.id === ui.messageModalLoan?.clientId)} onClose={closeModal} />}
            {activeModal?.type === 'RECEIPT' && ui.showReceipt && activeUser && <ReceiptModal data={ui.showReceipt} onClose={closeModal} userName={activeUser.businessName || activeUser.name || 'Empresa'} userDoc={activeUser.document} />}
            {activeModal?.type === 'PROOF_VIEW' && activeModal.payload && <Modal onClose={closeModal} title="Comprovante"><img src={activeModal.payload} alt="Comprovante" className="w-full h-auto rounded-xl" /></Modal>}
            {activeModal?.type === 'NOTE' && <NoteWrapper />}
            {activeModal?.type === 'AI_ASSISTANT' && <AIAssistantModal onClose={closeModal} onCommandDetected={aiCtrl.handleAICommand} loans={loans} sources={sources} activeUser={activeUser} />}
        </>
    );
};

export const AdminModals = () => {
    const { activeModal, closeModal, ui, adminCtrl } = useModal();
    const { masterEditUser } = ui;

    if (activeModal?.type !== 'MASTER_EDIT_USER' || !masterEditUser) return null;

    return (
       <Modal onClose={closeModal} title={`Editar Usuário: ${masterEditUser.nome_operador}`}>
           <div className="space-y-4">
               <input type="text" placeholder="Nome" value={masterEditUser.nome_operador} onChange={e => ui.setMasterEditUser({...masterEditUser, nome_operador: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none"/>
               <input type="text" placeholder="Empresa" value={masterEditUser.nome_empresa} onChange={e => ui.setMasterEditUser({...masterEditUser, nome_empresa: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none"/>
               <input type="text" placeholder="PIX" value={masterEditUser.pix_key || ''} onChange={e => ui.setMasterEditUser({...masterEditUser, pix_key: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none"/>
               <input type="password" placeholder="Nova Senha (deixe em branco p/ manter)" value={masterEditUser.newPassword || ''} onChange={e => ui.setMasterEditUser({...masterEditUser, newPassword: e.target.value})} className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none"/>
               <button onClick={adminCtrl.handleMasterUpdateUser} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold uppercase">Salvar</button>
           </div>
       </Modal>
    );
};
