
import React from 'react';
import { LogOut, ChevronDown, Lock, LayoutList } from 'lucide-react';

interface PortalHeaderProps {
    loggedClient: any;
    selectedLoanId: string;
    setSelectedLoanId: (id: string) => void;
    clientContracts: any[];
    handleLogout: () => void;
    onOpenContracts: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({ 
    loggedClient, selectedLoanId, setSelectedLoanId, clientContracts, handleLogout, onOpenContracts
}) => {
    return (
        <div className="bg-slate-950 border-b border-slate-800 shrink-0 relative z-20">
            <div className="p-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
                        {loggedClient.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bem-vindo(a)</p>
                        <p className="text-white font-bold text-sm truncate max-w-[150px]">{loggedClient.name.split(' ')[0]}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-2.5 bg-slate-900 text-slate-500 border border-slate-800 rounded-xl hover:text-rose-500 hover:border-rose-500/30 transition-colors">
                    <LogOut size={16}/>
                </button>
            </div>

            {/* CONTRATO SWITCHER / BOTÃO LISTA */}
            <div className="px-5 pb-5 flex gap-2">
                <div className="relative group flex-1">
                    <select 
                        value={selectedLoanId}
                        onChange={(e) => setSelectedLoanId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-white text-xs font-bold uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                        disabled={clientContracts.length <= 1}
                    >
                        {clientContracts.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.code ? `CONTRATO #${c.code}` : `CONTRATO ...${c.id.substring(0, 6).toUpperCase()}`} - {new Date(c.start_date || c.created_at).toLocaleDateString('pt-BR')}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none text-slate-500 group-hover:text-white transition-colors">
                        <ChevronDown size={16} />
                    </div>
                </div>
                
                <button 
                    onClick={onOpenContracts}
                    className="px-3 bg-slate-900 border border-slate-800 rounded-xl text-blue-500 hover:bg-slate-800 hover:text-white transition-colors"
                    title="Ver Todos os Contratos"
                >
                    <LayoutList size={20}/>
                </button>
            </div>
        </div>
    );
};
