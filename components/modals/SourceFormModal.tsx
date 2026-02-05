
import React from 'react';
import { Modal } from '../ui/Modal';
import { ShieldCheck } from 'lucide-react';

interface SourceFormModalProps {
    onClose: () => void;
    ui: any;
    sourceCtrl: any;
    activeUser: any;
}

export const SourceFormModal: React.FC<SourceFormModalProps> = ({ onClose, ui, sourceCtrl, activeUser }) => {
    const staffMembers = ui.staffMembers || [];

    return (
        <Modal onClose={onClose} title="Configuração de Fundo">
            <div className="space-y-5">
                <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black ml-1 mb-2 block">Identificação</label>
                    <input type="text" placeholder="Nome da Fonte" className="w-full bg-slate-950 p-4 rounded-2xl text-white outline-none border border-slate-800 focus:border-blue-500 transition-all" value={ui.sourceForm.name} onChange={e => ui.setSourceForm({...ui.sourceForm, name: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-black ml-1 mb-2 block">Tipo</label>
                        <select className="w-full bg-slate-950 p-4 rounded-2xl text-white outline-none border border-slate-800" value={ui.sourceForm.type} onChange={e => ui.setSourceForm({...ui.sourceForm, type: e.target.value})}>
                            <option value="BANK">Banco / Digital</option>
                            <option value="CASH">Espécie</option>
                            <option value="WALLET">Carteira</option>
                            <option value="CARD">Cartão</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-black ml-1 mb-2 block">Saldo Inicial</label>
                        <input type="text" inputMode="decimal" placeholder="R$ 0,00" className="w-full bg-slate-950 p-4 rounded-2xl text-white outline-none border border-slate-800" value={ui.sourceForm.balance} onChange={e => ui.setSourceForm({...ui.sourceForm, balance: e.target.value.replace(/[^0-9.,]/g, '')})} />
                    </div>
                </div>

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
    );
};
