import React, { useMemo } from 'react';
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

  // ✅ GARANTE o loanId correto (aceita snake_case e camelCase)
  const loanId = loan?.id || loan?.loan_id || loan?.loanId || loan?.contract_id || null;

  // ✅ GARANTE o clientId correto (aceita snake_case e camelCase)
  const clientId = loan?.client_id || loan?.clientId || loan?.clientID || null;

  if (!isOpen) return null;

  // ✅ Se não tiver loanId, nem abre chat (evita erro "Dados inválidos" + travamento)
  if (!loanId) {
    return (
      <div className="fixed inset-0 z-[200] flex justify-end">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative w-full sm:max-w-md bg-slate-900 h-full shadow-2xl flex flex-col p-6">
          <div className="text-white font-black text-sm mb-2">Atendimento Direto</div>
          <div className="text-slate-400 text-xs">
            Este contrato não possui <span className="font-bold">id/loan_id</span> carregado no portal.
            <br />
            Ajuste a query do portal para trazer <span className="font-bold">id</span> (UUID).
          </div>
          <button
            onClick={onClose}
            className="mt-6 w-full py-3 bg-slate-800 text-white rounded-xl text-xs font-black uppercase"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // ✅ Se não tiver clientId, nem abre chat (evita INSERT bloqueado + travamento)
  if (!clientId) {
    return (
      <div className="fixed inset-0 z-[200] flex justify-end">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative w-full sm:max-w-md bg-slate-900 h-full shadow-2xl flex flex-col p-6">
          <div className="text-white font-black text-sm mb-2">Atendimento Direto</div>
          <div className="text-slate-400 text-xs">
            Este contrato não possui <span className="font-bold">client_id</span> carregado no portal.
            <br />
            Ajuste a query do portal para trazer <span className="font-bold">client_id</span>.
          </div>
          <button
            onClick={onClose}
            className="mt-6 w-full py-3 bg-slate-800 text-white rounded-xl text-xs font-black uppercase"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative w-full sm:max-w-md bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <UnifiedChat
          adapter={adapter}
          context={{ loanId, profileId: clientId, clientName: 'Suporte CapitalFlow' }}
          role="CLIENT"
          userId={clientId}
          onClose={onClose}
          title="Atendimento Direto"
          subtitle="Canal Verificado"
        />

        <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 sm:hidden">
          <p className="text-[8px] text-slate-600 text-center font-black uppercase tracking-widest">
            Conexão Segura CapitalFlow SSL
          </p>
        </div>
      </div>
    </div>
  );
};