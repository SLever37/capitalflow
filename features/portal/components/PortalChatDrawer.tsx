
import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { UnifiedChat } from '../../../components/chat/UnifiedChat';
import { createSupportAdapter } from '../../../components/chat/adapters/supportAdapter';
import { supabasePortal } from '../../../lib/supabasePortal';

interface PortalChatDrawerProps {
    loan: any;
    isOpen: boolean;
    onClose: () => void;
}

export const PortalChatDrawer: React.FC<PortalChatDrawerProps> = ({ loan, isOpen, onClose }) => {
    const adapter = useMemo(() => createSupportAdapter('CLIENT', supabasePortal), []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex justify-end">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative w-full sm:max-w-md bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <UnifiedChat
                    adapter={adapter}
                    context={{ loanId: loan.id, profileId: loan.profile_id, clientName: 'Suporte CapitalFlow' }}
                    role="CLIENT"
                    userId={loan.profile_id}
                    onClose={onClose}
                    title="Atendimento Direto"
                    subtitle="Canal Verificado"
                />
                
                {/* Footer Seguro p/ Mobile */}
                <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 sm:hidden">
                    <p className="text-[8px] text-slate-600 text-center font-black uppercase tracking-widest">Conexão Segura CapitalFlow SSL</p>
                </div>
            </div>
        </div>
    );
};
