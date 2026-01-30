import React from 'react';
import { Landmark, Banknote, Wallet, Edit2, PlusCircle, Trash2 } from 'lucide-react';
import { CapitalSource } from '../../types';
import { formatMoney } from '../../utils/formatters';

interface SourceCardProps {
    source: CapitalSource;
    onEdit: (source: CapitalSource) => void;
    onAddFunds: (source: CapitalSource) => void;
    onDelete: (id: string) => void;
    isStealthMode?: boolean;
}

export const SourceCard: React.FC<SourceCardProps> = ({ 
    source, onEdit, onAddFunds, onDelete, isStealthMode 
}) => {
    return (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className={`absolute top-0 right-0 p-8 opacity-10 transition-opacity group-hover:opacity-20 ${source.type === 'BANK' ? 'text-blue-500' : source.type === 'CASH' ? 'text-emerald-500' : 'text-purple-500'}`}>
                {source.type === 'BANK' ? <Landmark size={100} /> : source.type === 'CASH' ? <Banknote size={100} /> : <Wallet size={100} />}
            </div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 flex items-center gap-2">
                        {source.type === 'BANK' ? 'CONTA BANCÁRIA' : source.type === 'CASH' ? 'DINHEIRO FÍSICO' : 'CARTEIRA DIGITAL'}
                    </p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(source); }} 
                        className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Editar Saldo Manualmente"
                    >
                        <Edit2 size={12}/>
                    </button>
                </div>
                
                <h3 className="text-2xl font-black text-white mb-1 truncate pr-4" title={source.name}>{source.name}</h3>
                
                <p className={`text-3xl font-bold my-6 ${source.balance < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                    {formatMoney(source.balance, isStealthMode)}
                </p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAddFunds(source); }} 
                        className="flex-1 py-3 bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-500 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-900/20"
                    >
                        <PlusCircle size={14}/> Adicionar
                    </button>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(source.id); }} 
                        className="py-3 px-4 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-500 rounded-xl transition-all"
                        title="Excluir Fonte"
                    >
                        <Trash2 size={16}/>
                    </button>
                </div>
            </div>
        </div>
    );
};