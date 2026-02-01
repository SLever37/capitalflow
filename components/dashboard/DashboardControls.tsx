
import React, { useState } from 'react';
import { ShieldAlert, ArrowDownWideNarrow, Search, X } from 'lucide-react';
import { SortOption } from '../../types';

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
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

    const toggleSearch = () => {
        setIsMobileSearchOpen(!isMobileSearchOpen);
        setIsMobileSortOpen(false);
    };

    const toggleSort = () => {
        setIsMobileSortOpen(!isMobileSortOpen);
        setIsMobileSearchOpen(false);
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Linha Principal de Filtros e Ações Rápidas */}
            <div className="flex items-center gap-2">
                
                {/* Ícones de Ação (Apenas Mobile) */}
                <div className="flex md:hidden gap-1.5 flex-shrink-0">
                    <button 
                        onClick={toggleSearch}
                        className={`p-2.5 rounded-xl border transition-all ${isMobileSearchOpen ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                        <Search size={18} />
                    </button>
                    <button 
                        onClick={toggleSort}
                        className={`p-2.5 rounded-xl border transition-all ${isMobileSortOpen ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                        <ArrowDownWideNarrow size={18} />
                    </button>
                </div>

                {/* Filtros de Status (Scroll Horizontal) */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1 py-1">
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

                {/* Ordenação Desktop (Escondida no Mobile) */}
                <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl min-w-fit">
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

            {/* Area de Busca Expansível (Mobile) ou Fixa (Desktop) */}
            {(isMobileSearchOpen || window.innerWidth >= 768) && (
                <div className={`bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 ${!isMobileSearchOpen ? 'hidden md:flex' : 'flex'}`}>
                    <Search className="text-slate-500 ml-2 flex-shrink-0" size={18}/>
                    <input 
                        type="text" 
                        placeholder="Buscar por nome, CPF/CNPJ..." 
                        className="bg-transparent w-full p-2 text-white outline-none text-sm" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        autoFocus={isMobileSearchOpen}
                    />
                    {isMobileSearchOpen && (
                        <button onClick={() => setIsMobileSearchOpen(false)} className="p-2 text-slate-500 hover:text-white">
                            <X size={18}/>
                        </button>
                    )}
                </div>
            )}

            {/* Area de Ordenação Expansível (Apenas Mobile) */}
            {isMobileSortOpen && (
                <div className="md:hidden bg-slate-900 border border-slate-800 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Ordenar por:</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { val: 'DUE_DATE_ASC', label: 'Vencimento' },
                            { val: 'NAME_ASC', label: 'Nome' },
                            { val: 'CREATED_DESC', label: 'Mais Novo' },
                            { val: 'UPDATED_DESC', label: 'Recente' }
                        ].map(opt => (
                            <button 
                                key={opt.val}
                                onClick={() => { setSortOption(opt.val as SortOption); setIsMobileSortOpen(false); }}
                                className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${sortOption === opt.val ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
