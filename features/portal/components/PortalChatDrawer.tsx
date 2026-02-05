
import React from 'react';
import { X, MessageSquare, ShieldCheck } from 'lucide-react';
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
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>
            
            <div className={`
                relative w-full md:w-[500px] lg:w-[600px] h-[100dvh] bg-slate-900 shadow-2xl flex flex-col 
                animate-in slide-in-from-right duration-300 border-l border-slate-800
            `}>
                <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg">
                            <MessageSquare size={20}/>
                        </div>
                        <div>
                            <h3 className="text-white font-black uppercase text-xs sm:text-sm tracking-tighter">Atendimento</h3>
                            <p className="text-[9px] text-emerald-500 font-black uppercase flex items-center gap-1">
                                <ShieldCheck size={10}/> Canal Seguro
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-all">
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden min-h-0">
                    <ChatContainer 
                        loanId={loan.id} 
                        profileId={loan.profile_id} 
                        senderType="CLIENT"
                        placeholder="Em que podemos ajudar?"
                    />
                </div>
            </div>
        </div>
    );
};
