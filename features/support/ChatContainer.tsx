
import React, { useRef, useEffect } from 'react';
import { Phone, Video, Lock } from 'lucide-react';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { useSupportRealtime } from './hooks/useSupportRealtime';
import { useSupportCalls } from './hooks/useSupportCalls';

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
  const { messages, ticketStatus, isOnline, isLoading, sendMessage, updateTicketStatus } =
    useSupportRealtime(loanId, profileId, senderType);

  // ✅ CHAMADAS (voz/vídeo)
  const {
    uiStatus: callStatus,
    currentCall,
    remoteStream,
    localStream,
    startCall,
    acceptIncoming,
    rejectIncoming,
    endCall,
  } = useSupportCalls({ loanId, profileId, role: senderType });

  const scrollRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }
  }, [messages]);

  // bind streams (video)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleSend = async (text: string, type: any = 'text', file?: any, meta?: any) => {
    // upload fica em outro passo ou componente; aqui só envia texto/links/metadata
    // Se 'file' for string, passamos como fileUrl
    const fileUrl = typeof file === 'string' ? file : undefined;
    
    try {
      await sendMessage(text, type, fileUrl, meta);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Falha ao enviar mensagem');
    }
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
              <button
                onClick={() => startCall('VOICE')}
                className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 hover:text-white hover:bg-emerald-600 rounded-full shadow-lg border border-slate-700 transition-all"
                title="Chamada de voz"
              >
                <Phone size={16} />
              </button>
              <button
                onClick={() => startCall('VIDEO')}
                className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 hover:text-white hover:bg-blue-600 rounded-full shadow-lg border border-slate-700 transition-all"
                title="Chamada de vídeo"
              >
                <Video size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Overlay de chamada */}
      {callStatus !== 'IDLE' && currentCall && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="text-white font-black uppercase text-sm">
              {currentCall.call_type === 'VIDEO' ? 'Chamada de vídeo' : 'Chamada de voz'}
              <span className="ml-2 text-[10px] text-slate-400 font-bold">
                {callStatus === 'RINGING' ? 'Chamando...' : 'Em andamento'}
              </span>
            </div>

            <button
              onClick={endCall}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase"
            >
              Encerrar
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 flex items-center justify-center p-4">
            {currentCall.call_type === 'VIDEO' ? (
              <div className="w-full max-w-md flex flex-col gap-3">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-2xl bg-black border border-slate-800"
                />
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-40 rounded-xl bg-black border border-slate-800 self-end -mt-28 mr-3"
                />
              </div>
            ) : (
              <div className="text-center text-white">
                <div className="text-lg font-black uppercase">
                  {callStatus === 'RINGING' ? 'Conectando...' : 'Chamada ativa'}
                </div>
                <div className="text-xs text-slate-400 font-bold mt-2">
                  Áudio em andamento
                </div>
              </div>
            )}
          </div>

          {/* Ações (callee) */}
          {callStatus === 'RINGING' && currentCall.callee_role === senderType && (
            <div className="p-4 border-t border-slate-800 flex gap-3 justify-center">
              <button
                onClick={rejectIncoming}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase"
              >
                Recusar
              </button>
              <button
                onClick={acceptIncoming}
                className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"
              >
                Aceitar
              </button>
            </div>
          )}
        </div>
      )}

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
            <Lock size={14} className="text-slate-500" />
            <span className="text-xs text-slate-400 font-bold uppercase">Atendimento Finalizado</span>
            {senderType === 'CLIENT' && (
              <button
                onClick={handleReopen}
                className="ml-2 text-[10px] font-black text-blue-400 hover:text-white hover:underline uppercase"
              >
                Solicitar Reabertura
              </button>
            )}
          </div>
        </div>
      )}

      <ChatInput
        onSend={handleSend}
        isUploading={false}
        placeholder={placeholder}
      />
    </div>
  );
};
