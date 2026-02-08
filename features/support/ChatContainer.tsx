
import React from 'react';
import { Phone, Video } from 'lucide-react';
import { useChatMessages } from './hooks/useChatMessages';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';

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
  clientName,
}) => {
  const { messages, isUploading, sendMessage, scrollRef } = useChatMessages({
    loanId,
    profileId,
    senderType,
    operatorId
  });

  return (
    <div className="flex flex-col h-full bg-slate-950/20 relative overflow-hidden overflow-x-hidden">
      {/* Header Actions (Floating) */}
      <div className="absolute top-0 right-0 left-0 p-2 flex justify-end gap-2 pointer-events-none z-10 px-4 pt-3">
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => console.log('TODO: WebRTC Voz')}
            className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 hover:text-white hover:bg-emerald-600 rounded-full shadow-lg border border-slate-700 transition-all"
            title="Ligação de Voz (Em breve)"
          >
            <Phone size={16} />
          </button>
          <button
            onClick={() => console.log('TODO: WebRTC Video')}
            className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 hover:text-white hover:bg-blue-600 rounded-full shadow-lg border border-slate-700 transition-all"
            title="Chamada de Vídeo (Em breve)"
          >
            <Video size={16} />
          </button>
        </div>
      </div>

      <ChatMessages 
        messages={messages} 
        currentUserId={senderType === 'OPERATOR' && operatorId ? operatorId : profileId} // Ajuste fino para identificar "EU"
        senderType={senderType}
        operatorId={operatorId}
        scrollRef={scrollRef}
      />

      <ChatInput 
        onSend={sendMessage}
        isUploading={isUploading}
        placeholder={placeholder}
      />
    </div>
  );
};