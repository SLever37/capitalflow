
import React, { useState, useRef } from 'react';
import { Send, Paperclip, Mic, X, Square, Loader2 } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AttachMenu } from './AttachMenu';
import { SupportMessageType } from '../../../services/supportChat.service';

interface ChatInputProps {
  onSend: (text: string, type?: SupportMessageType, file?: File, meta?: any) => Promise<void>;
  isUploading: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isUploading, placeholder }) => {
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isRecording, recordMs, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  const handleSendText = async () => {
    if (!text.trim()) return;
    await onSend(text, 'text');
    setText('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const type = isImage ? 'image' : 'file';
    const caption = isImage ? '📷 Imagem' : `📎 Arquivo: ${file.name}`;

    onSend(caption, type, file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowAttachMenu(false);
  };

  const handleAttachSelect = (type: 'location' | 'image' | 'file') => {
    if (type === 'location') {
        onSend('📍 Localização (Demo)', 'location');
        setShowAttachMenu(false);
    } 
    // Image e File são tratados pelo fileInputRef via click no AttachMenu (que recebe a ref)
  };

  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result) {
      await onSend('🎤 Mensagem de voz', 'audio', result.audioFile, { duration_ms: result.duration });
    }
  };

  const formatRecordTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${String(rs).padStart(2, '0')}`;
  };

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800 relative select-none">
      {/* Menu de Anexos */}
      {showAttachMenu && (
        <AttachMenu 
            onSelect={handleAttachSelect} 
            fileInputRef={fileInputRef} 
        />
      )}

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {/* Interface de Gravação Ativa */}
      {isRecording ? (
        <div className="flex items-center gap-4 bg-slate-800 p-3 rounded-2xl animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 flex-1">
                <span className="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Gravando {formatRecordTime(recordMs)}
                </span>
            </div>
            
            <button onClick={cancelRecording} className="p-2 text-rose-400 hover:text-white transition-colors text-[10px] font-bold uppercase">
                Cancelar
            </button>
            
            <button 
                onClick={handleStopRecording} 
                className="p-2 bg-emerald-600 rounded-full text-white hover:bg-emerald-500 shadow-lg"
            >
                <Send size={18} className="ml-0.5"/>
            </button>
        </div>
      ) : (
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
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              className="w-full bg-transparent px-4 py-3 text-white text-xs outline-none resize-none max-h-24 custom-scrollbar placeholder:text-slate-600"
              placeholder={placeholder || 'Digite sua mensagem...'}
              rows={1}
              style={{ minHeight: '44px' }}
              disabled={isUploading}
            />
          </div>

          {text.trim() ? (
            <button
              onClick={handleSendText}
              disabled={isUploading}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          ) : (
            <button
              // Pointer events para suportar mobile touch sem delay
              onPointerDown={(e) => {
                  e.preventDefault();
                  startRecording();
              }}
              disabled={isUploading}
              className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all active:scale-95 hover:bg-slate-700"
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
