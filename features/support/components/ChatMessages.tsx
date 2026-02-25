
import React, { useEffect, useRef } from 'react';
import { SupportMessage } from '../../../services/supportChat.service';
import { AudioPlayer } from './AudioPlayer';
import { Check, CheckCheck, FileText, Image as ImageIcon, MapPin, User, ExternalLink, Trash2 } from 'lucide-react';

interface ChatMessagesProps {
  messages: SupportMessage[];
  currentUserId: string;
  senderType: 'CLIENT' | 'OPERATOR';
  operatorId?: string;
  scrollRef?: React.RefObject<HTMLDivElement>;
  onDeleteMessage?: (id: string) => void;
}

function buildMapsUrlFromMessage(m: SupportMessage): { url: string | null; lat?: number; lng?: number } {
  // 1) Prefer metadata
  const lat = (m as any)?.metadata?.lat;
  const lng = (m as any)?.metadata?.lng;

  if (typeof lat === 'number' && typeof lng === 'number') {
    return { url: `https://maps.google.com/?q=${lat},${lng}`, lat, lng };
  }

  // 2) Try extract from content: https://maps.google.com/?q=LAT,LNG
  const content = String(m.content || m.text || '').trim();
  const match = content.match(/q=([-0-9.]+),\s*([-0-9.]+)/i);
  if (match) {
    const lat2 = Number(match[1]);
    const lng2 = Number(match[2]);
    if (Number.isFinite(lat2) && Number.isFinite(lng2)) {
      return { url: `https://maps.google.com/?q=${lat2},${lng2}`, lat: lat2, lng: lng2 };
    }
  }

  // 3) If content itself is a URL, use it
  if (content.startsWith('http://') || content.startsWith('https://')) {
    return { url: content };
  }

  return { url: null };
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  currentUserId,
  senderType,
  operatorId,
  scrollRef,
  onDeleteMessage
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem quando a lista de mensagens mudar
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDelete = (id: string) => {
    if (confirm('Apagar esta mensagem permanentemente?')) {
        onDeleteMessage?.(id);
    }
  };

  const renderContent = (m: SupportMessage) => {
    switch (m.type) {
      case 'image':
        return (
          <div className="mt-1 mb-1">
            {m.file_url ? (
              <img
                src={m.file_url}
                alt="Anexo"
                className="rounded-lg max-w-full max-h-64 object-cover border border-white/5 cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => window.open(m.file_url || '', '_blank')}
              />
            ) : (
              <div className="bg-white/5 p-4 rounded-lg flex items-center gap-2">
                <ImageIcon size={16} /> Imagem indisponível
              </div>
            )}
            {m.content && <p className="text-[10px] mt-1 opacity-70">{m.content}</p>}
          </div>
        );

      case 'audio':
        return (
          <div className="min-w-[220px]">
            {m.file_url ? (
              <AudioPlayer
                src={m.file_url}
                duration={m.metadata?.duration_ms ? m.metadata.duration_ms / 1000 : undefined}
              />
            ) : (
              <div className="bg-white/5 p-3 rounded-xl text-[10px] opacity-70">
                Áudio indisponível.
              </div>
            )}
            {m.content && <p className="text-[10px] mt-1 opacity-70">{m.content}</p>}
          </div>
        );

      case 'location': {
        const maps = buildMapsUrlFromMessage(m);
        const label =
          typeof maps.lat === 'number' && typeof maps.lng === 'number'
            ? `${maps.lat.toFixed(6)}, ${maps.lng.toFixed(6)}`
            : 'Abrir no mapa';

        if (!maps.url) {
          return (
            <div className="bg-black/20 p-3 rounded-xl min-w-[220px] border border-white/5">
              <div className="flex items-center gap-2">
                <MapPin className="text-rose-400" size={18} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">Localização</p>
                  <p className="text-[9px] opacity-70">Indisponível (sem link/coords)</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <a
            href={maps.url}
            target="_blank"
            rel="noreferrer"
            className="block bg-black/20 p-3 rounded-xl min-w-[220px] border border-white/5 hover:bg-black/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin className="text-rose-400" size={18} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white">Localização</p>
                <p className="text-[9px] opacity-70 truncate">{label}</p>
              </div>
              <ExternalLink size={14} className="opacity-70" />
            </div>

            <div className="mt-2 text-[9px] font-black uppercase tracking-wider text-rose-200/80">
              📍 Ver no mapa
            </div>
          </a>
        );
      }

      case 'file':
        return (
          <a
            href={m.file_url || '#'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 bg-black/10 p-3 rounded-xl min-w-[200px] hover:bg-black/20 transition-colors"
          >
            <FileText size={20} className="shrink-0 text-blue-300" />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                {m.content?.replace('📎 Arquivo: ', '') || 'Documento'}
              </p>
              <p className="text-[9px] opacity-70 uppercase font-black text-blue-200">Baixar</p>
            </div>
          </a>
        );

      default:
        return (
          <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {m.content || (m as any).text}
          </p>
        );
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-2 min-h-0" ref={scrollRef}>
      {messages.map((m, index) => {
        const isMe = m.sender_type === senderType;
        const prevM = messages[index - 1];
        const isSequence = prevM && prevM.sender_type === m.sender_type;

        return (
          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1' : 'mt-4'} group`}>
            <div
              className={`max-w-[85%] px-4 py-3 relative ${
                isMe
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-[#1e293b] text-slate-200 rounded-2xl rounded-tl-sm'
              }`}
            >
              {renderContent(m)}

              <div
                className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider ${
                  isMe ? 'opacity-70 text-blue-100' : 'opacity-50 text-slate-400'
                }`}
              >
                {/* Botão de Deletar para Operador */}
                {senderType === 'OPERATOR' && isMe && onDeleteMessage && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} 
                        className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-300"
                        title="Apagar Mensagem"
                    >
                        <Trash2 size={10} />
                    </button>
                )}

                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

                {m.sender_type === 'OPERATOR' && m.operator_id && !isMe && (
                  <User size={8} className="ml-1" />
                )}

                {isMe && (m.read ? <CheckCheck size={12} className="text-white" /> : <Check size={12} />)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} className="h-4" />
    </div>
  );
};
