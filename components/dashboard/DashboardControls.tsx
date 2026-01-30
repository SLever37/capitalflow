
import React from 'react';
import { ShieldAlert, ArrowDownWideNarrow, Search, SortAsc, Calendar, User, Clock } from 'lucide-react';
import { SortOption } from '../../types';
import { startDictation } from '../../utils/speech';

interface DashboardControlsProps {
    statusFilter: string;
    setStatusFilter: (val: any) => void;
    sortOption: SortOption;
    setSortOption: (val: SortOption) => void;
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    showToast: (msg: string, type?: any) => void;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
    statusFilter, setStatusFilter, sortOption, setSortOption, searchTerm, setSearchTerm, showToast
}) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                {/* FILTROS DE STATUS */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 flex-1">
                    {['TODOS', 'ATRASADOS', 'ATRASO_CRITICO', 'EM_DIA', 'PAGOS', 'ARQUIVADOS'].map(filter => (
                        <button 
                            key={filter} 
                            onClick={() => setStatusFilter(filter as any)} 
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex items-center gap-2 ${statusFilter === filter ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'}`}
                        >
                            {filter === 'ATRASO_CRITICO' && <ShieldAlert size={14} className="text-rose-500" />}
                            {filter.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* ORDENAÇÃO */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl min-w-fit">
                    <div className="px-3 text-slate-500"><ArrowDownWideNarrow size={16}/></div>
                    <select 
                        value={sortOption} 
                        onChange={e => setSortOption(e.target.value as SortOption)}
                        className="bg-transparent text-white text-[10px] font-black uppercase outline-none p-2 cursor-pointer"
                    >
                        <option value="DUE_DATE_ASC">Vencimento Próximo</option>
                        <option value="NAME_ASC">Nome (A-Z)</option>
                        <option value="CREATED_DESC">Entrada (Novo)</option>
                        <option value="UPDATED_DESC">Alteração (Recente)</option>
                    </select>
                </div>
            </div>

            {/* BUSCA */}
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-2">
                <Search className="text-slate-500 ml-2" size={18}/>
                <input 
                    type="text" 
                    placeholder="Buscar contrato por nome, CPF/CNPJ, código, telefone..." 
                    className="bg-transparent w-full p-2 text-white outline-none text-sm" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                />
                <button 
                    onClick={() => startDictation(setSearchTerm, (msg) => showToast(msg, 'error'))} 
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 hover:text-white hover:border-slate-600 transition-colors text-xs font-black uppercase" 
                    title="Buscar por voz" 
                    type="button"
                >
                    🎙
                </button>
            </div>
        </div>
    );
};
