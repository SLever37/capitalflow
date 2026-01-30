import React from 'react';
import { Plus } from 'lucide-react';
import { CapitalSource } from '../types';
import { Modal } from '../components/ui/Modal';
import { SourceCard } from '../components/cards/SourceCard';

interface SourcesPageProps {
  sources: CapitalSource[];
  // Removidas props desnecessárias/undefined que vinham do container antigo
  openConfirmation: (config: any) => void;
  handleUpdateSourceBalance: () => void;
  isStealthMode?: boolean;
  ui: any; // UI State completo para acesso seguro aos modais
}

export const SourcesPage: React.FC<SourcesPageProps> = ({ 
  sources, openConfirmation, handleUpdateSourceBalance, isStealthMode, ui
}) => {

  const handleAddFunds = (source: CapitalSource) => {
      ui.setAddFundsValue(''); 
      ui.openModal('ADD_FUNDS', source);
  };

  const handleEditSource = (source: CapitalSource) => {
      ui.setEditingSource(source);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">Fontes de Capital</h2>
            <button 
                onClick={() => ui.openModal('SOURCE_FORM')} 
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
                <Plus size={16}/> Nova Fonte
            </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sources.map(source => (
                    <SourceCard 
                        key={source.id}
                        source={source}
                        onAddFunds={handleAddFunds}
                        onEdit={handleEditSource}
                        onDelete={(id) => openConfirmation({ type: 'DELETE_SOURCE', target: id })}
                        isStealthMode={isStealthMode}
                    />
                ))}
        </div>

        {/* Modal de Edição Manual de Saldo (Inventário) */}
        {ui.editingSource && (
            <Modal onClose={() => ui.setEditingSource(null)} title={`Ajuste Manual: ${ui.editingSource.name}`}>
                <div className="space-y-4">
                    <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-xl">
                        <p className="text-[10px] text-amber-200 uppercase font-bold text-center">
                            Atenção: Use apenas para correção de inventário. Para entradas/saídas, use as funções do sistema.
                        </p>
                    </div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Novo Saldo Atual</label>
                    <input 
                        type="number" 
                        value={ui.editingSource.balance} 
                        onChange={e => ui.setEditingSource({...ui.editingSource, balance: parseFloat(e.target.value) || 0})} 
                        className="w-full bg-slate-950 p-4 rounded-xl text-white text-xl font-bold outline-none border border-slate-800 focus:border-blue-500 transition-colors" 
                    />
                    <button 
                        onClick={handleUpdateSourceBalance} 
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl uppercase transition-all shadow-lg"
                    >
                        Salvar Correção
                    </button>
                </div>
            </Modal>
        )}
    </div>
  );
};