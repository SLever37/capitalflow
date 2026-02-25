
import React from 'react';
import { ChatAdapter, ChatRole } from './chatAdapter';
import { useUnifiedChat } from './useUnifiedChat';
import { ChatMessages } from '../../features/support/components/ChatMessages';
import { ChatInput } from '../../features/support/components/ChatInput';
import { Loader2, MessageCircle, ShieldCheck, Lock, Unlock, Trash2, ChevronLeft } from 'lucide-react';

interface UnifiedChatProps<TContext> {
  adapter: ChatAdapter<TContext>;
  context: TContext;
  role: ChatRole;
  userId: string;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  showDeleteHistory?: boolean;
  onDeleteHistory?: () => Promise<void>;
}

export function UnifiedChat<TContext>({
  adapter,
  context,
  role,
  userId,
  title,
  subtitle,
  onClose,
  showDeleteHistory,
  onDeleteHistory
}: UnifiedChatProps<TContext>) {
  const {
    messages,
    headerInfo,
    isLoading,
    isUploading,
    isOnline,
    ticketStatus,
    scrollRef,
    features,
    sendMessage,
    deleteMessage,
    toggleTicket
  } = useUnifiedChat({ adapter, context, role, userId });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const displayTitle = title || headerInfo?.title || 'Chat';
  const displaySubtitle = subtitle || headerInfo?.subtitle || '';

  return (
    <div className="flex-1 flex flex-col bg-slate-900 relative min-h-0 overflow-hidden">
      {/* Header Interno do Chat (se não for passado externamente) */}
      <div className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onClose && (
            <button 
              onClick={onClose} 
              className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold shrink-0">
              {displayTitle.charAt(0)}
            </div>
            {features.hasPresence && (
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white uppercase truncate">{displayTitle}</h2>
            <p className="text-[10px] text-slate-500 font-mono truncate">
              {displaySubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {showDeleteHistory && onDeleteHistory && (
                <button 
                    onClick={onDeleteHistory}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-all"
                    title="Apagar Histórico"
                >
                    <Trash2 size={18}/>
                </button>
            )}
            
            {features.canClose && (
                <button 
                    onClick={toggleTicket}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase backdrop-blur-md shadow-lg border transition-all flex items-center gap-1 ${ticketStatus === 'OPEN' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-black' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'}`}
                >
                    {ticketStatus === 'OPEN' ? <><Lock size={12}/> Encerrar</> : <><Unlock size={12}/> Reabrir</>}
                </button>
            )}
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 relative min-h-0">
        <ChatMessages 
          messages={messages as any}
          currentUserId={userId}
          senderType={role === 'OPERATOR' ? 'OPERATOR' : 'CLIENT'}
          scrollRef={scrollRef}
          onDeleteMessage={features.canDelete ? deleteMessage : undefined}
        />
      </div>

      {/* Input */}
      <ChatInput 
        onSend={async (text, type, file, meta) => {
            await sendMessage(text, type as any, file, meta);
        }}
        isUploading={isUploading}
        placeholder={ticketStatus === 'CLOSED' ? 'Atendimento encerrado' : 'Digite sua mensagem...'}
      />
      
      {ticketStatus === 'CLOSED' && role !== 'OPERATOR' && (
          <div className="absolute inset-x-0 bottom-20 flex justify-center px-4 pointer-events-none">
              <div className="bg-amber-500/90 text-black text-[10px] font-black uppercase px-4 py-2 rounded-full shadow-xl backdrop-blur-sm flex items-center gap-2">
                  <Lock size={12} /> Atendimento Encerrado
              </div>
          </div>
      )}
    </div>
  );
};
