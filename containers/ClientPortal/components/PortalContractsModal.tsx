
import React from 'react';
import { X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

interface PortalContractsModalProps {
    contracts: any[];
    currentLoanId: string;
    onSelect: (id: string) => void;
    onClose: () => void;
}

export const PortalContractsModal: React.FC<PortalContractsModalProps> = ({ contracts, currentLoanId, onSelect, onClose }) => {
    return (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl relative animate-in zoom-in-95 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-white uppercase flex items-center gap-2">
                        <FileText className="text-blue-500"/> Meus Contratos
                    </h2>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {contracts.length === 0 ? (
                        <p className="text-center text-slate-500 text-xs py-10">Nenhum contrato encontrado.</p>
                    ) : (
                        contracts.map(contract => {
                            // Assumindo que temos campos básicos. Se não, fallback.
                            const total = contract.total_to_receive || 0;
                            const isPaid = false; // Lógica simplificada, idealmente viria do backend se está quitado
                            // O backend fetchClientContracts retorna {id, start_date, principal, total_to_receive} e filtra is_archived=false

                            return (
                                <button 
                                    key={contract.id} 
                                    onClick={() => onSelect(contract.id)}
                                    className={`w-full p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${currentLoanId === contract.id ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                            Contrato #{contract.id.substring(0,6)}
                                        </span>
                                        {currentLoanId === contract.id && <CheckCircle2 size={16} className="text-blue-500"/>}
                                    </div>
                                    
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-slate-300 font-bold uppercase">{new Date(contract.start_date).toLocaleDateString('pt-BR')}</p>
                                            <p className="text-[10px] text-slate-500">Iniciado em</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-white">{formatMoney(total)}</p>
                                            <p className="text-[10px] text-slate-500 uppercase">Valor Total</p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
