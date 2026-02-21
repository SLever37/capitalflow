
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
import { Copy, KeyRound, User, Camera, ShieldCheck, MapPin, Mail, Hash } from 'lucide-react';
import { maskPhone, maskDocument } from '../../utils/formatters';

export const ClientModals = () => {
    const { activeModal, closeModal, ui, clientCtrl } = useModal();
    const { clientForm, editingClient } = ui;
    const canImportContacts = 'contacts' in navigator && 'ContactsManager' in window;

    if (activeModal?.type !== 'CLIENT_FORM') return null;

    // Recupera códigos (Edição ou Rascunho gerado pelo controller)
    const accessCode = editingClient?.access_code || ui.clientDraftAccessCode;
    const clientNumber = editingClient?.client_number || ui.clientDraftNumber;

    return (
       <Modal onClose={closeModal} title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}>
           <div className="space-y-5">
               {/* Avatar Section */}
               <div className="flex justify-center mb-2">
                   <div className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer group" onClick={() => editingClient && ui.clientAvatarInputRef.current?.click()}>
                       {clientForm.fotoUrl ? <img src={clientForm.fotoUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-slate-500" />}
                       {editingClient && <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={20} /></div>}
                   </div>
               </div>
               <input type="file" ref={ui.clientAvatarInputRef} className="hidden" accept="image/*" onChange={clientCtrl.handleAvatarUpload}/>
               
               {!editingClient && <p className="text-center text-[10px] text-slate-500 italic">Salve o cliente para adicionar uma foto.</p>}

               {/* Credenciais do Portal */}
               <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-lg text-slate-400"><KeyRound size={20}/></div>
                        <div>
                            <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">Código de Acesso</p>
                            <p className="text-lg font-black text-white tracking-widest">{accessCode || '----'}</p>
                        </div>
                    </div>
                    <div className="text-right border-l border-slate-800 pl-4">
                        <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">Nº Cliente</p>
                        <p className="text-lg font-black text-blue-500">{clientNumber || '----'}</p>
                    </div>
               </div>

               <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Nome Completo</label>
                        <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.name || ''} onChange={e => ui.setClientForm({...clientForm, name: e.target.value})} placeholder="Ex: João da Silva"/>
                    </div>
                    
                    <div className="col-span-6">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Telefone / WhatsApp</label>
                        <div className="flex gap-1">
                            <input type="tel" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.phone || ''} onChange={e => ui.setClientForm({...clientForm, phone: maskPhone(e.target.value)})} placeholder="(00) 00000-0000"/>
                            {canImportContacts && <button onClick={clientCtrl.handlePickContact} className="px-3 bg-slate-900 border border-slate-800 rounded-xl text-blue-400 hover:text-white hover:bg-blue-600 transition-all" title="Importar da Agenda"><User size={20}/></button>}
                        </div>
                    </div>
                    
                    <div className="col-span-6">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">CPF / CNPJ</label>
                        <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.document || ''} onChange={e => ui.setClientForm({...clientForm, document: maskDocument(e.target.value)})} placeholder="000.000.000-00"/>
                    </div>

                    <div className="col-span-12">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 flex items-center gap-1"><Mail size={10}/> E-mail</label>
                        <input type="email" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.email || ''} onChange={e => ui.setClientForm({...clientForm, email: e.target.value})} placeholder="cliente@email.com"/>
                    </div>

                    <div className="col-span-12">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 flex items-center gap-1"><MapPin size={10}/> Endereço</label>
                        <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors mb-2" value={clientForm.address || ''} onChange={e => ui.setClientForm({...clientForm, address: e.target.value})} placeholder="Rua, Número, Bairro"/>
                        
                        <div className="grid grid-cols-3 gap-2">
                            <input type="text" className="col-span-2 w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.city || ''} onChange={e => ui.setClientForm({...clientForm, city: e.target.value})} placeholder="Cidade"/>
                            <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.state || ''} onChange={e => ui.setClientForm({...clientForm, state: e.target.value.toUpperCase()})} maxLength={2} placeholder="UF"/>
                        </div>
                    </div>
               </div>

               <div className="space-y-1">
                   <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 block">Observações</label>
                   <textarea placeholder="Notas internas sobre o cliente..." className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none h-24 text-sm resize-none focus:border-blue-500 transition-colors" value={clientForm.notes || ''} onChange={e => ui.setClientForm({...clientForm, notes: e.target.value})} />
               </div>

               <button onClick={clientCtrl.handleSaveClient} disabled={ui.isSaving} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl uppercase shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 transition-all">{ui.isSaving ? 'Salvando...' : 'Salvar Cliente'}</button>
           </div>
       </Modal>
    );
};

export const FinanceModals = () => {
    const { activeModal, closeModal, ui, sourceCtrl, paymentCtrl, activeUser, sources } = useModal();
    const staffMembers = ui.staffMembers || [];

    return (
        <>
            {activeModal?.type === 'SOURCE_FORM' && (
                <Modal onClose={closeModal} title="Configuração de Fundo">
                    <div className="space-y-5">
                        <div>
                            <label className="text-[10px] uppercase text-slate-500 font-black ml-1 mb-2 block">Identificação</label>
                            <input type="text" placeholder="Nome da Fonte" className="w-full bg-slate-950 p-4 rounded-2xl text-white outline-none border border-slate-800 focus:border-blue-500 transition-all" value={ui.sourceForm.name || ''} onChange={e => ui.setSourceForm({...ui.sourceForm, name: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase text-slate-500 font-black ml-1 mb-2 block">Tipo</label>
                                <select className="w-full bg-slate-950 p-4 rounded-2xl text-white outline-none border border-slate-800" value={ui.sourceForm.type || 'BANK'} onChange={e => ui.setSourceForm({...ui.sourceForm, type: e.target.value})}>
                                    <option value="BANK">Banco / Digital</option><option value="CASH">Espécie</option><option value="WALLET">Carteira</option><option value="CARD">Cartão</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-slate-500 font-black ml-1 mb-2 block">Saldo Inicial</label>
                                <input type="text" inputMode="decimal" placeholder="R$ 0,00" className="w-full bg-slate-950 p-4 rounded-2xl text-white outline-none border border-slate-800" value={ui.sourceForm.balance || ''} onChange={e => ui.setSourceForm({...ui.sourceForm, balance: e.target.value.replace(/[^0-9.,]/g, '')})} />
                            </div>
                        </div>

                        {/* NOVO: DESIGNAR CARTEIRA A OPERADOR (EXCLUSIVIDADE) */}
                        {activeUser?.accessLevel === 1 && staffMembers.length > 0 && (
                            <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-3xl space-y-3">
                                <div className="flex items-center gap-2 text-indigo-400">
                                    <ShieldCheck size={18}/>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Acesso Privado</span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-tight">Ao selecionar um colaborador, esta carteira só poderá ser usada por ele e pelo administrador.</p>
                                <select 
                                    className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl p-3 text-xs text-white outline-none"
                                    value={ui.sourceForm.operador_permitido_id || ''}
                                    onChange={e => ui.setSourceForm({...ui.sourceForm, operador_permitido_id: e.target.value || null})}
                                >
                                    <option value="">Carteira Pública (Todos)</option>
                                    {staffMembers.map((s: any) => (
                                        <option key={s.id} value={s.id}>Acesso exclusivo: {s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button onClick={sourceCtrl.handleSaveSource} disabled={ui.isSaving} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase shadow-xl transition-all">{ui.isSaving ? 'Sincronizando...' : 'Salvar Fonte'}</button>
                    </div>
                </Modal>
            )}

            {activeModal?.type === 'ADD_FUNDS' && (
                <Modal onClose={closeModal} title={`Aporte: ${activeModal.payload.name}`}>
                    <div className="space-y-4">
                        <input type="text" inputMode="decimal" placeholder="Valor (R$)" className="w-full bg-slate-950 p-4 rounded-xl text-white text-xl font-bold outline-none border border-slate-800" value={ui.addFundsValue || ''} onChange={e => ui.setAddFundsValue(e.target.value.replace(/[^0-9.,]/g, ''))} autoFocus />
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
                        <input type="text" inputMode="decimal" placeholder="Valor do Resgate" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.withdrawValue || ''} onChange={e => ui.setWithdrawValue(e.target.value.replace(/[^0-9.,]/g, ''))} />
                        <select className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.withdrawSourceId || ''} onChange={e => ui.setWithdrawSourceId(e.target.value)}>
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
