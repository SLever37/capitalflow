import React from 'react';
import { X, MessageSquare, Zap } from 'lucide-react';
import { ChatContainer } from '../../support/ChatContainer';

interface PortalChatDrawerProps {
    loan: any;
    isOpen: boolean;
    onClose: () => void;
}

export const PortalChatDrawer: React.FC<PortalChatDrawerProps> = ({ loan, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex justify-end">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-sm bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white">
                            <MessageSquare size={20}/>
                        </div>
                        <div>
                            <h3 className="text-white font-black uppercase text-xs tracking-tighter">Atendimento</h3>
                            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                <Zap size={10} className="fill-emerald-500"/> Suporte Direto
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-900 text-slate-500 rounded-lg hover:text-white transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden">
                    <ChatContainer 
                        loanId={loan.id} 
                        profileId={loan.profile_id} 
                        senderType="CLIENT"
                        placeholder="Descreva sua dúvida aqui..."
                    />
                </div>
            </div>
        </div>
    );
};