import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  FileText,
  Loader2,
  Check,
  CheckCheck,
  User,
  Video,
  Phone,
  MapPin,
  Image as ImageIcon,
  Play,
  Pause,
  X
} from 'lucide-react';
import { supportChatService, SupportMessage } from '../../services/supportChat.service';
import { supabase } from '../../lib/supabase';
import { playNotificationSound } from '../../utils/notificationSound';

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
  placeholder
}) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  useEffect(() => {
    const loadMessages = async () => {
      const data = await supportChatService.getMessages(loanId);
      setMessages(data);
      await supportChatService.markAsRead(loanId, senderType);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    };
    loadMessages();

    const channel = supabase
      .channel(`room-${loanId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_suporte', filter: `loan_id=eq.${loanId}` },
        async (payload) => {
          const newMsg = payload.new as SupportMessage;
          setMessages((prev) => [...prev, newMsg]);

          if (newMsg.sender !== senderType) {
            playNotificationSound();
            await supportChatService.markAsRead(loanId, senderType);
          }

          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loanId]);

  const handleSend = async (text?: string, type: any = 'text') => {
    const msg = (text ?? inputText).trim();
    if (!msg && type === 'text') return;

    setIsUploading(true);
    try {
      await supportChatService.sendMessage({
        loanId: loanId,
        profileId: profileId,
        sender: senderType,
        operatorId: operatorId || undefined,
        text: msg,
        type
      });
      setInputText('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      await supportChatService.sendMessage({
        loanId: loanId,
        profileId: profileId,
        sender: senderType,
        operatorId: operatorId || undefined,
        text: type === 'image' ? '📷 Imagem' : `📎 Arquivo: ${file.name}`,
        type,
        file: file
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowAttachMenu(false);
    }
  };

  const handleSimulateAction = (action: 'VOICE' | 'VIDEO' | 'LOCATION' | 'AUDIO_MSG') => {
    if (action === 'AUDIO_MSG') {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        handleSend('🎤 Mensagem de Voz (0:05)', 'audio');
      }, 2000);
    }
    setShowAttachMenu(false);
  };

  const renderMessageContent = (m: SupportMessage) => {
    switch (m.type) {
      case 'image':
        return (
          <div className="mt-1 mb-1">
            {m.file_url ? (
              <img
                src={m.file_url}
                alt="Anexo"
                className="rounded-lg max-w-full max-h-48 object-cover border border-white/10"
              />
            ) : (
              <div className="bg-black/20 p-4 rounded-lg flex items-center gap-2">
                <ImageIcon size={16} /> Imagem indisponível
              </div>
            )}
            <p className="text-[10px] mt-1 opacity-70">{m.text}</p>
          </div>
        );

      case 'audio': {
        const isPlaying = playingAudioId === m.id;
        return (
          <div className="flex items-center gap-3 bg-black/10 p-2 rounded-xl min-w-[200px] max-w-full overflow-hidden">
            <button
              onClick={() => setPlayingAudioId(isPlaying ? null : m.id)}
              className="w-9 h-9 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-sm shrink-0"
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-[1px]" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="h-1 bg-white/30 rounded-full w-full mb-1 overflow-hidden">
                <div
                  className={`h-full bg-white ${isPlaying ? 'animate-[width_2s_linear_infinite]' : 'w-0'}`}
                  style={{ width: isPlaying ? '100%' : '0%' }}
                />
              </div>
              <p className="text-[9px] font-mono opacity-80 text-right">0:05</p>
            </div>
          </div>
        );
      }

      case 'location':
        return (
          <div className="bg-slate-800 p-1 rounded-xl overflow-hidden min-w-[220px] max-w-full">
            <div className="h-24 bg-slate-700 relative flex items-center justify-center opacity-80">
              <MapPin className="text-rose-500 drop-shadow-md" size={32} fill="currentColor" />
            </div>
            <div className="p-2">
              <p className="text-xs font-bold text-white">Localização Compartilhada</p>
              <p className="text-[9px] text-slate-400">Clique para abrir no Maps</p>
            </div>
          </div>
        );

      case 'file':
        return (
          <a
            href={m.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-black/10 p-3 rounded-xl hover:bg-black/20 transition-colors max-w-full overflow-hidden"
          >
            <div className="p-2 bg-white/10 rounded-lg shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{m.text.replace('📎 Arquivo: ', '')}</p>
              <p className="text-[9px] opacity-70 uppercase font-black">Baixar Documento</p>
            </div>
          </a>
        );

      default:
        return <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/20 relative overflow-hidden overflow-x-hidden">
      {/* Header com ações (fixo no topo) */}
      <div className="absolute top-0 right-0 left-0 p-2 flex justify-end gap-2 pointer-events-none z-10 px-4 pt-3">
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => handleSimulateAction('VOICE')}
            className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 hover:text-white hover:bg-emerald-600 rounded-full shadow-lg border border-slate-700 transition-all"
          >
            <Phone size={16} />
          </button>
          <button
            onClick={() => handleSimulateAction('VIDEO')}
            className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 hover:text-white hover:bg-blue-600 rounded-full shadow-lg border border-slate-700 transition-all"
          >
            <Video size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-4 pt-12" ref={scrollRef}>
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === senderType ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] sm:max-w-[85%] p-3 rounded-2xl shadow-sm relative group overflow-hidden ${
                m.sender === senderType
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
              }`}
            >
              {renderMessageContent(m)}
              <div className="flex items-center justify-end gap-1 mt-1 opacity-50 text-[8px] font-black uppercase">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {m.sender === 'OPERATOR' && m.operator_id === operatorId && <User size={8} className="ml-1" />}
                {m.sender === senderType && (m.read ? <CheckCheck size={10} className="text-emerald-300" /> : <Check size={10} />)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 relative">
        {showAttachMenu && (
          <div className="absolute bottom-20 left-4 bg-slate-800 border border-slate-700 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 animate-in slide-in-from-bottom-2 z-20 w-40">
            <button
              onClick={() => handleSimulateAction('LOCATION')}
              className="flex items-center gap-3 p-3 hover:bg-slate-700 rounded-xl text-xs text-white transition-colors"
            >
              <MapPin size={16} className="text-rose-500" /> Localização
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 p-3 hover:bg-slate-700 rounded-xl text-xs text-white transition-colors"
            >
              <ImageIcon size={16} className="text-blue-500" /> Galeria
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 p-3 hover:bg-slate-700 rounded-xl text-xs text-white transition-colors"
            >
              <FileText size={16} className="text-emerald-500" /> Documento
            </button>
          </div>
        )}

        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

        <div className="flex gap-2 items-end">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={`p-3 rounded-xl transition-all ${
              showAttachMenu ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {showAttachMenu ? <X size={20} /> : <Paperclip size={20} />}
          </button>

          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl flex items-center focus-within:border-blue-500 transition-colors">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full bg-transparent px-4 py-3 text-white text-xs outline-none resize-none max-h-24 custom-scrollbar placeholder:text-slate-600"
              placeholder={placeholder || 'Digite sua mensagem...'}
              rows={1}
              style={{ minHeight: '44px' }}
              disabled={isUploading}
            />
          </div>

          {inputText.trim() ? (
            <button
              onClick={() => handleSend()}
              disabled={isUploading}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          ) : (
            <button
              onMouseDown={() => handleSimulateAction('AUDIO_MSG')}
              className={`p-3 rounded-xl transition-all shadow-lg active:scale-95 ${
                isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
