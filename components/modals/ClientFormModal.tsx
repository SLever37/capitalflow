
import React from 'react';
import { Modal } from '../ui/Modal';
import { User, Camera, KeyRound, Mail, MapPin } from 'lucide-react';
import { maskPhone, maskDocument } from '../../utils/formatters';

interface ClientFormModalProps {
    onClose: () => void;
    ui: any;
    clientCtrl: any;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({ onClose, ui, clientCtrl }) => {
    const { clientForm, editingClient } = ui;
    const canImportContacts = 'contacts' in navigator && 'ContactsManager' in window;

    const accessCode = editingClient?.access_code || ui.clientDraftAccessCode;
    const clientNumber = editingClient?.client_number || ui.clientDraftNumber;

    return (
        <Modal onClose={onClose} title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}>
            <div className="space-y-5">
                <div className="flex justify-center mb-2">
                    <div className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer group" onClick={() => editingClient && ui.clientAvatarInputRef.current?.click()}>
                        {clientForm.fotoUrl ? <img src={clientForm.fotoUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-slate-500" />}
                        {editingClient && <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={20} /></div>}
                    </div>
                </div>
                
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
                        <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.name} onChange={e => ui.setClientForm({...clientForm, name: e.target.value})} placeholder="Ex: João da Silva"/>
                    </div>
                    
                    <div className="col-span-6">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">Telefone / WhatsApp</label>
                        <div className="flex gap-1">
                            <input type="tel" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.phone} onChange={e => ui.setClientForm({...clientForm, phone: maskPhone(e.target.value)})} placeholder="(00) 00000-0000"/>
                            {canImportContacts && <button onClick={clientCtrl.handlePickContact} className="px-3 bg-slate-900 border border-slate-800 rounded-xl text-blue-400 hover:text-white hover:bg-blue-600 transition-all" title="Importar da Agenda"><User size={20}/></button>}
                        </div>
                    </div>
                    
                    <div className="col-span-6">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 block">CPF / CNPJ</label>
                        <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.document} onChange={e => ui.setClientForm({...clientForm, document: maskDocument(e.target.value)})} placeholder="000.000.000-00"/>
                    </div>

                    <div className="col-span-12">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 flex items-center gap-1"><Mail size={10}/> E-mail</label>
                        <input type="email" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.email} onChange={e => ui.setClientForm({...clientForm, email: e.target.value})} placeholder="cliente@email.com"/>
                    </div>

                    <div className="col-span-12">
                        <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 mb-1 flex items-center gap-1"><MapPin size={10}/> Endereço</label>
                        <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors mb-2" value={clientForm.address} onChange={e => ui.setClientForm({...clientForm, address: e.target.value})} placeholder="Rua, Número, Bairro"/>
                        <div className="grid grid-cols-3 gap-2">
                            <input type="text" className="col-span-2 w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.city} onChange={e => ui.setClientForm({...clientForm, city: e.target.value})} placeholder="Cidade"/>
                            <input type="text" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none text-sm focus:border-blue-500 transition-colors" value={clientForm.state} onChange={e => ui.setClientForm({...clientForm, state: e.target.value.toUpperCase()})} maxLength={2} placeholder="UF"/>
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-500 font-bold ml-1 block">Observações</label>
                    <textarea placeholder="Notas internas sobre o cliente..." className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none h-24 text-sm resize-none focus:border-blue-500 transition-colors" value={clientForm.notes} onChange={e => ui.setClientForm({...clientForm, notes: e.target.value})} />
                </div>

                <button onClick={clientCtrl.handleSaveClient} disabled={ui.isSaving} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl uppercase shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 transition-all">{ui.isSaving ? 'Salvando...' : 'Salvar Cliente'}</button>
            </div>
        </Modal>
    );
};
