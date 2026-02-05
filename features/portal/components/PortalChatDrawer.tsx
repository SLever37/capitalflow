
import React from 'react';
import { X, MessageSquare, ShieldCheck, PhoneCall, Headphones } from 'lucide-react';
import { ChatContainer } from '../../support/ChatContainer';

interface PortalChatDrawerProps {
    loan: any;
    isOpen: boolean;
    onClose: () => void;
}

export const PortalChatDrawer: React.FC<PortalChatDrawerProps> = ({ loan, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex justify-end">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose}></div>
            
            <div className={`
                relative w-full md:w-[600px] lg:w-[700px] h-[100dvh] bg-slate-900 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col 
                animate-in slide-in-from-right duration-500 border-l border-slate-800 overflow-hidden
            `}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#3b82f6_0%,transparent_50%)]"></div>
                </div>

                <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0 relative z-10 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] text-white shadow-xl shadow-blue-900/30 flex items-center justify-center ring-4 ring-blue-900/20">
                            <Headphones size={24}/>
                        </div>
                        <div>
                            <h3 className="text-white font-black uppercase text-sm sm:text-base tracking-tighter leading-none">Atendimento ao Cliente</h3>
                            <p className="text-[10px] text-emerald-500 font-black uppercase flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Canal de Suporte Seguro
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-800 text-slate-400 rounded-2xl hover:text-white hover:bg-slate-700 transition-all active:scale-90">
                        <X size={24}/>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden min-h-0 relative z-10">
                    <ChatContainer 
                        loanId={loan.id} 
                        profileId={loan.profile_id} 
                        senderType="CLIENT"
                        placeholder="Descreva sua dúvida ou solicitação..."
                    />
                </div>

                <div className="bg-slate-950/80 p-3 border-t border-slate-800 text-center relative z-10">
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">Criptografia de Dados • Protocolo Eletrônico Ativo</p>
                </div>
            </div>
        </div>
    );
};
