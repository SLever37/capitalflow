
import React, { useState } from 'react';
import { ShieldAlert, ArrowDownWideNarrow, Search, X, Users, ChevronDown } from 'lucide-react';
import { SortOption, UserProfile } from '../../types';

interface DashboardControlsProps {
    statusFilter: string;
    setStatusFilter: (val: any) => void;
    sortOption: SortOption;
    setSortOption: (val: SortOption) => void;
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    showToast: (msg: string, type?: any) => void;
    staffMembers?: UserProfile[];
    selectedStaffId: string;
    onStaffChange: (id: string) => void;
    isMaster: boolean;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
    statusFilter, setStatusFilter, sortOption, setSortOption, searchTerm, setSearchTerm, showToast,
    staffMembers = [], selectedStaffId, onStaffChange, isMaster
}) => {
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

    return (
        <div className="flex flex-col gap-3">
            {/* Seletor de Equipe (Apenas Master) */}
            {isMaster && staffMembers.length > 1 && (
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/20">
                        <Users size={16}/>
                    </div>
                    <div className="flex-1 relative group">
                        <select 
                            value={selectedStaffId}
                            onChange={e => onStaffChange(e.target.value)}
                            className="w-full appearance-none bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pr-10 text-[10px] font-black uppercase text-white outline-none focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-800"
                        >
                            <option value="ALL">Visualizar: Toda a Equipe</option>
                            <optgroup label="Colaboradores">
                                {staffMembers.map(s => (
                                    <option key={s.id} value={s.id}>Operador: {s.name}</option>
                                ))}
                            </optgroup>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-indigo-500" size={16}/>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                <div className="flex md:hidden gap-1.5 flex-shrink-0">
                    <button 
                        onClick={() => { setIsMobileSearchOpen(!isMobileSearchOpen); setIsMobileSortOpen(false); }}
                        className={`p-2.5 rounded-xl border transition-all ${isMobileSearchOpen ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                        <Search size={18} />
                    </button>
                    <button 
                        onClick={() => { setIsMobileSortOpen(!isMobileSortOpen); setIsMobileSearchOpen(false); }}
                        className={`p-2.5 rounded-xl border transition-all ${isMobileSortOpen ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                        <ArrowDownWideNarrow size={18} />
                    </button>
                </div>

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

                <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl min-w-fit relative group">
                    <div className="px-3 text-slate-500"><ArrowDownWideNarrow size={16}/></div>
                    <select 
                        value={sortOption} 
                        onChange={e => setSortOption(e.target.value as SortOption)}
                        className="appearance-none bg-transparent text-white text-[10px] font-black uppercase outline-none p-2 pr-8 cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                    >
                        <option value="DUE_DATE_ASC">Vencimento Próximo</option>
                        <option value="NAME_ASC">Nome (A-Z)</option>
                        <option value="CREATED_DESC">Entrada (Novo)</option>
                        <option value="UPDATED_DESC">Alteração (Recente)</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white" size={14}/>
                </div>
            </div>

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
                </div>
            )}

            {/* Mobile Sort Dropdown */}
            {isMobileSortOpen && (
                <div className="md:hidden bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 relative">
                    <div className="px-3 text-slate-500"><ArrowDownWideNarrow size={16}/></div>
                    <select 
                        value={sortOption} 
                        onChange={e => { setSortOption(e.target.value as SortOption); setIsMobileSortOpen(false); }}
                        className="appearance-none bg-transparent text-white text-[10px] font-black uppercase outline-none p-2 w-full cursor-pointer"
                    >
                        <option value="DUE_DATE_ASC">Vencimento Próximo</option>
                        <option value="NAME_ASC">Nome (A-Z)</option>
                        <option value="CREATED_DESC">Entrada (Novo)</option>
                        <option value="UPDATED_DESC">Alteração (Recente)</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16}/>
                </div>
            )}
        </div>
    );
};
