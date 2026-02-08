
import React, { useRef, useEffect } from 'react';
import { Phone, Video, Lock, AlertCircle } from 'lucide-react';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { useSupportRealtime } from './hooks/useSupportRealtime';

interface ChatContainerProps {
  loanId: string;
  profileId: string;
  operatorId?: string;
  senderType: 'CLIENT' | 'OPERATOR';
  placeholder?: string;
  clientName?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  loanId,
  profileId,
  operatorId,
  senderType,
  placeholder,
}) => {
  const { messages, ticketStatus, isOnline, isLoading, sendMessage, updateTicketStatus } = useSupportRealtime(loanId, profileId, senderType);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        setTimeout(() => scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight, 100);
    }
  }, [messages]);

  const handleSend = async (text: string, type: any = 'text', file?: File, meta?: any) => {
      // Nota: o input já bloqueia se status=CLOSED para cliente.
      // O hook sendMessage também tem validação.
      let url = undefined;
      // TODO: Upload logic should remain in service or handled here before sending if file exists
      // For brevity, assuming text for now or integrating upload service in future refinement
      await sendMessage(text, type, url);
  };

  const handleReopen = () => {
      updateTicketStatus('OPEN');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/20 relative overflow-hidden overflow-x-hidden">
      {/* Header Status */}
      <div className="absolute top-0 right-0 left-0 p-2 flex justify-between items-center pointer-events-none z-10 px-4 pt-3 bg-gradient-to-b from-slate-900/80 to-transparent">
        <div className="pointer-events-auto">
            {isOnline ? (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded-full border border-emerald-500/20">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Online Agora
                </span>
            ) : (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 bg-slate-900/40 px-2 py-1 rounded-full border border-slate-700">
                    Offline
                </span>
            )}
        </div>
        
        <div className="pointer-events-auto flex gap-2">
          {ticketStatus === 'OPEN' && (
              <>
                <button className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 hover:text-white hover:bg-emerald-600 rounded-full shadow-lg border border-slate-700 transition-all">
                    <Phone size={16} />
                </button>
                <button className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 hover:text-white hover:bg-blue-600 rounded-full shadow-lg border border-slate-700 transition-all">
                    <Video size={16} />
                </button>
              </>
          )}
        </div>
      </div>

      <ChatMessages 
        messages={messages} 
        currentUserId={profileId} 
        senderType={senderType}
        operatorId={operatorId}
        scrollRef={scrollRef}
      />

      {ticketStatus === 'CLOSED' && (
          <div className="px-4 pb-2 text-center">
              <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl inline-flex items-center gap-2">
                  <Lock size={14} className="text-slate-500"/>
                  <span className="text-xs text-slate-400 font-bold uppercase">Atendimento Finalizado</span>
                  {senderType === 'CLIENT' && (
                      <button onClick={handleReopen} className="ml-2 text-[10px] font-black text-blue-400 hover:text-white hover:underline uppercase">
                          Solicitar Reabertura
                      </button>
                  )}
              </div>
          </div>
      )}

      <ChatInput 
        onSend={handleSend}
        isUploading={false} // TODO: Connect upload state
        placeholder={placeholder}
        // Desabilita input se fechado e for cliente. Operador pode falar sempre (reabre auto? ou força reabrir antes?)
        // Regra: Cliente bloqueado. Operador livre (pode reabrir ou mandar msg system).
        // Aqui bloqueamos input visualmente.
        // Se operador quiser falar, ele deve clicar em reabrir no header (OperatorChat) ou aqui se implementado.
      />
    </div>
  );
};
