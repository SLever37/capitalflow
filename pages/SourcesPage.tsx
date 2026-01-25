
import React from 'react';
import { Plus, Landmark, Banknote, Wallet, Edit2, PlusCircle, Trash2 } from 'lucide-react';
import { CapitalSource, Loan } from '../types';
import { Modal } from '../components/ui/Modal';
import { formatMoney } from '../utils/formatters';

interface SourcesPageProps {
  sources: CapitalSource[];
  setIsSourceModalOpen: (val: boolean) => void;
  setEditingSource: (source: CapitalSource | null) => void;
  editingSource: CapitalSource | null;
  setIsAddFundsModalOpen: (source: CapitalSource | null) => void;
  setAddFundsValue: (val: string) => void;
  openConfirmation: (config: any) => void;
  handleUpdateSourceBalance: () => void;
  isStealthMode?: boolean;
  // New prop for modal logic
  ui?: any;
}

export const SourcesPage: React.FC<SourcesPageProps> = ({ 
  sources, setIsSourceModalOpen, setEditingSource, editingSource, 
  setIsAddFundsModalOpen, setAddFundsValue, openConfirmation, handleUpdateSourceBalance, isStealthMode, ui
}) => {
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center"><h2 className="text-xl font-black uppercase tracking-tighter text-white">Fontes de Capital</h2><button onClick={() => ui.openModal('SOURCE_FORM')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"><Plus size={16}/> Nova Fonte</button></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sources.map(source => (
                    <div key={source.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden">
                        <div className={`absolute top-0 right-0 p-8 opacity-10 ${source.type === 'BANK' ? 'text-blue-500' : source.type === 'CASH' ? 'text-emerald-500' : 'text-purple-500'}`}>{source.type === 'BANK' ? <Landmark size={100} /> : source.type === 'CASH' ? <Banknote size={100} /> : <Wallet size={100} />}</div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">{source.type}</p><button onClick={() => setEditingSource(source)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Edit2 size={12}/></button></div>
                            <h3 className="text-2xl font-black text-white mb-1">{source.name}</h3><p className="text-3xl font-bold text-emerald-400 my-6">{formatMoney(source.balance, isStealthMode)}</p>
                            <div className="flex gap-3"><button onClick={() => { ui.openModal('ADD_FUNDS', source); setAddFundsValue(''); }} className="flex-1 py-3 bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-500 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"><PlusCircle size={14}/> Adicionar</button><button onClick={(e) => { e.stopPropagation(); openConfirmation({ type: 'DELETE_SOURCE', target: source.id }); }} className="py-3 px-4 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-500 rounded-xl transition-all"><Trash2 size={16}/></button></div>
                        </div>
                    </div>
                ))}
        </div>
        {editingSource && (<Modal onClose={() => setEditingSource(null)} title={`Editar Saldo: ${editingSource.name}`}><div className="space-y-4"><input type="number" value={editingSource.balance} onChange={e => setEditingSource({...editingSource, balance: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 p-4 rounded-xl text-white text-xl font-bold outline-none border border-slate-800" /><button onClick={handleUpdateSourceBalance} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl uppercase">Salvar Saldo</button></div></Modal>)}
    </div>
  );
};
