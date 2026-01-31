
import React from 'react';
import { Plus, Search, Edit, Trash2, CheckSquare, Square, XCircle, CheckCircle } from 'lucide-react';
import { Client } from '../types';
import { startDictation } from '../utils/speech';

interface ClientsPageProps {
  filteredClients: Client[];
  clientSearchTerm: string;
  setClientSearchTerm: (term: string) => void;
  openClientModal: (client?: Client) => void;
  openConfirmation: (config: any) => void;
  showToast: (msg: string, type?: 'error') => void;
  // Bulk actions props
  isBulkDeleteMode: boolean;
  toggleBulkDeleteMode: () => void;
  selectedClientsToDelete: string[];
  toggleClientSelection: (id: string) => void;
  executeBulkDelete: () => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ 
  filteredClients, clientSearchTerm, setClientSearchTerm, 
  openClientModal, openConfirmation, showToast,
  isBulkDeleteMode, toggleBulkDeleteMode, selectedClientsToDelete, toggleClientSelection, executeBulkDelete
}) => {
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">Carteira de Clientes</h2>
            <div className="flex gap-2">
                {isBulkDeleteMode ? (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right">
                        <button onClick={executeBulkDelete} disabled={selectedClientsToDelete.length === 0} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-rose-500 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">
                            <Trash2 size={16}/> Confirmar ({selectedClientsToDelete.length})
                        </button>
                        <button onClick={toggleBulkDeleteMode} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 transition-all flex items-center gap-2">
                            <XCircle size={16}/> Cancelar
                        </button>
                    </div>
                ) : (
                    <>
                        <button onClick={toggleBulkDeleteMode} className="px-4 py-2 bg-slate-800 border border-slate-700 text-rose-400 rounded-xl text-[10px] font-black uppercase hover:bg-rose-900/20 hover:border-rose-500 transition-all flex items-center gap-2">
                            <Trash2 size={16}/> Excluir Vários
                        </button>
                        <button onClick={() => openClientModal()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
                            <Plus size={16}/> Novo Cliente
                        </button>
                    </>
                )}
            </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-2">
            <Search className="text-slate-500 ml-2" size={18}/>
            <input type="text" placeholder="Buscar cliente por nome, CPF/CNPJ, código, telefone, e-mail..." className="bg-transparent w-full p-2 text-white outline-none text-sm" value={clientSearchTerm} onChange={e => setClientSearchTerm(e.target.value)} />
            <button onClick={() => startDictation(setClientSearchTerm, (msg) => showToast(msg, 'error'))} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 hover:text-white hover:border-slate-600 transition-colors text-xs font-black uppercase" title="Buscar por voz" type="button">🎙</button>
        </div>
        
        {/* GRID RESPONSIVA AJUSTADA: sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredClients.map(client => (
                <div 
                    key={client.id} 
                    className={`bg-slate-900 border p-6 rounded-[2rem] transition-all group relative ${isBulkDeleteMode ? 'cursor-pointer border-slate-700 hover:border-blue-500' : 'border-slate-800 hover:border-blue-500/50'} ${isBulkDeleteMode && selectedClientsToDelete.includes(client.id) ? 'bg-blue-900/10 border-blue-500' : ''}`}
                    onClick={isBulkDeleteMode ? () => toggleClientSelection(client.id) : undefined}
                >
                    {isBulkDeleteMode && (
                        <div className="absolute top-4 right-4 text-blue-500">
                            {selectedClientsToDelete.includes(client.id) ? <CheckSquare size={24} className="fill-blue-500/20"/> : <Square size={24} className="text-slate-600"/>}
                        </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 font-black text-xl group-hover:text-blue-500 transition-colors overflow-hidden border border-slate-700">
                            {client.name.charAt(0)}
                        </div>
                        {!isBulkDeleteMode && (
                            <div className="flex gap-2">
                                <button onClick={() => openClientModal(client)} className="p-2 text-slate-600 hover:text-white transition-colors"><Edit size={16}/></button>
                                <button onClick={(e) => { e.stopPropagation(); openConfirmation({ type: 'DELETE_CLIENT', target: client.id }); }} className="p-2 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                            </div>
                        )}
                    </div>
                    <h3 className="font-bold text-white text-lg truncate pr-6">{client.name}</h3>
                    <p className="text-sm text-slate-500 mb-4">{client.phone}</p>
                    <div className="space-y-2 pt-4 border-t border-slate-800"><div className="flex justify-between text-xs"><span className="text-slate-600 uppercase font-bold">Documento</span><span className="text-slate-400">{(client as any).document || '-'}</span></div><div className="flex justify-between text-xs"><span className="text-slate-600 uppercase font-bold">Endereço</span><span className="text-slate-400 truncate max-w-[150px]">{(client as any).address || '-'}</span></div></div>
                </div>
            ))}
        </div>
    </div>
  );
};
