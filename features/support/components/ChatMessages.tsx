
import React from 'react';
import { SupportMessage } from '../../../services/supportChat.service';
import { AudioPlayer } from './AudioPlayer';
import { Check, CheckCheck, FileText, Image as ImageIcon, MapPin, User } from 'lucide-react';

interface ChatMessagesProps {
  messages: SupportMessage[];
  currentUserId: string;
  senderType: 'CLIENT' | 'OPERATOR';
  operatorId?: string;
  scrollRef: React.RefObject<HTMLDivElement>;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  messages, 
  currentUserId, 
  senderType, 
  operatorId, 
  scrollRef 
}) => {

  const renderContent = (m: SupportMessage) => {
    switch (m.type) {
      case 'image':
        return (
          <div className="mt-1 mb-1">
            {m.file_url ? (
              <img
                src={m.file_url}
                alt="Anexo"
                className="rounded-lg max-w-full max-h-48 object-cover border border-white/10 cursor-pointer"
                onClick={() => window.open(m.file_url || '', '_blank')}
              />
            ) : (
              <div className="bg-black/20 p-4 rounded-lg flex items-center gap-2">
                <ImageIcon size={16} /> Imagem indisponível
              </div>
            )}
            {m.content && <p className="text-[10px] mt-1 opacity-70">{m.content}</p>}
          </div>
        );

      case 'audio':
        return (
          <div className="min-w-[200px]">
            {m.file_url ? (
              <AudioPlayer src={m.file_url} duration={m.metadata?.duration_ms ? m.metadata.duration_ms / 1000 : undefined} />
            ) : (
              <div className="bg-black/20 p-3 rounded-xl text-[10px] opacity-70">
                Áudio indisponível.
              </div>
            )}
            {m.content && <p className="text-[10px] mt-1 opacity-70">{m.content}</p>}
          </div>
        );

      case 'location':
        return (
          <div className="bg-slate-800 p-2 rounded-xl min-w-[200px]">
            <div className="flex items-center gap-2">
              <MapPin className="text-rose-500" size={18} />
              <div>
                <p className="text-xs font-bold text-white">Localização</p>
                <p className="text-[9px] text-slate-400">Compartilhada no chat</p>
              </div>
            </div>
          </div>
        );

      case 'file':
        return (
          <a
            href={m.file_url || '#'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 bg-black/10 p-3 rounded-xl min-w-[200px] hover:bg-black/20 transition-colors"
          >
            <FileText size={18} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                {m.content?.replace('📎 Arquivo: ', '') || 'Documento'}
              </p>
              <p className="text-[9px] opacity-70 uppercase font-black">Baixar</p>
            </div>
          </a>
        );

      default:
        return <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content || m.text}</p>;
    }
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4 pt-12" ref={scrollRef}>
      {messages.map((m) => {
        // Lógica de "Quem sou eu": Comparar ID do usuário ou Tipo de Remetente
        // No sistema atual, sender_type ('CLIENT' | 'OPERATOR') é o mais confiável para UI alignment
        const isMe = m.sender_type === senderType;

        return (
          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] p-3 rounded-2xl shadow-sm relative group ${
                isMe
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
              }`}
            >
              {renderContent(m)}
              
              <div className="flex items-center justify-end gap-1 mt-1 opacity-50 text-[8px] font-black uppercase">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                
                {/* Se for operador falando, mostra ícone */}
                {m.sender_type === 'OPERATOR' && m.operator_id && !isMe && (
                   <User size={8} className="ml-1" />
                )}

                {isMe && (
                  m.read ? <CheckCheck size={10} className="text-emerald-300" /> : <Check size={10} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
