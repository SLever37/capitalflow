
import React from 'react';
import { X, MessageSquare, ShieldCheck, Monitor } from 'lucide-react';
import { ChatContainer } from '../../support/ChatContainer';

interface PortalChatDrawerProps {
    loan: any;
    client: any; // Adicionado prop client
    isOpen: boolean;
    onClose: () => void;
}

export const PortalChatDrawer: React.FC<PortalChatDrawerProps> = ({ loan, client, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex justify-end">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative w-full sm:max-w-md bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
                            <MessageSquare size={20}/>
                        </div>
                        <div>
                            <h3 className="text-white font-black uppercase text-xs tracking-tighter">Atendimento Direto</h3>
                            <p className="text-[10px] text-emerald-500 font-black uppercase flex items-center gap-1">
                                <ShieldCheck size={10}/> Canal Verificado
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-900 text-slate-500 rounded-xl hover:text-white transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden">
                    <ChatContainer 
                        loanId={loan.id} 
                        // CORREÇÃO CRÍTICA: O profileId deve ser o do CLIENTE logado, não o do contrato (operador)
                        profileId={client?.id} 
                        operatorId={loan.profile_id}
                        senderType="CLIENT"
                        clientName={client?.name || 'Cliente'}
                        placeholder="Digite sua dúvida ou envie um comprovante..."
                    />
                </div>
                
                {/* Footer Seguro p/ Mobile */}
                <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 sm:hidden">
                    <p className="text-[8px] text-slate-600 text-center font-black uppercase tracking-widest">Conexão Segura CapitalFlow SSL</p>
                </div>
            </div>
        </div>
    );
};
