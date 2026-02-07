import React, { useRef, useState } from 'react';
import { Send, Mic, Paperclip, X, Square, Loader2 } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { supportChatService } from '../services/supportChat.service';

interface ChatInputProps {
  onSend: (text: string, type?: 'text' | 'audio' | 'file' | 'image', url?: string, meta?: any) => void;
  isDisabled: boolean;
  onOpenNewTicket?: () => void;
  canOpenNewTicket?: boolean;
  errorMessage?: string | null;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isDisabled,
  onOpenNewTicket,
  canOpenNewTicket,
  errorMessage
}) => {
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, startRecording, stopRecording, audioBlob, discardAudio } = useAudioRecorder();

  const handleSendText = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const handleSendAudio = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    try {
      const url = await supportChatService.uploadMedia(audioBlob, 'audio');
      onSend('Mensagem de Voz', 'audio', url, { size: audioBlob.size });
      discardAudio();
    } catch (e) {
      console.error(e);
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
      const url = await supportChatService.uploadMedia(file, type);
      onSend(type === 'image' ? 'Imagem' : file.name, type, url, { fileName: file.name, fileSize: file.size });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isDisabled) {
    return (
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Atendimento Encerrado</div>

        {canOpenNewTicket && onOpenNewTicket && (
          <button
            onClick={onOpenNewTicket}
            className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-wider"
          >
            Abrir novo chamado
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-800">
      {errorMessage && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-bold">
          {errorMessage}
        </div>
      )}

      {/* Audio Recording UI */}
      {isRecording || audioBlob ? (
        <div className="flex items-center gap-4 bg-slate-800 p-3 rounded-2xl animate-in slide-in-from-bottom-2">
          {isRecording ? (
            <div className="flex items-center gap-3 flex-1">
              <span className="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-white">Gravando áudio...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xs font-bold text-emerald-400">Áudio pronto para envio</span>
            </div>
          )}

          {isRecording ? (
            <button onClick={stopRecording} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 text-white">
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <>
              <button onClick={discardAudio} className="p-2 text-rose-400 hover:text-rose-300">
                <X size={20} />
              </button>
              <button
                onClick={handleSendAudio}
                disabled={isUploading}
                className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500"
              >
                {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-colors"
          >
            <Paperclip size={20} />
          </button>

          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl flex items-center focus-within:border-blue-500 transition-colors">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              placeholder="Digite sua mensagem..."
              className="w-full bg-transparent px-4 py-3 text-white text-sm outline-none resize-none max-h-32 custom-scrollbar placeholder:text-slate-600"
              rows={1}
              style={{ minHeight: '46px' }}
            />
          </div>

          {text.trim() ? (
            <button
              onClick={handleSendText}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg active:scale-95"
            >
              <Send size={20} />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all active:scale-95"
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};