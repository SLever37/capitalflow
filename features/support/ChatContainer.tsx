
import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, StopCircle, Video, Phone, Loader2, Trash2, AlertCircle, X, Smile } from 'lucide-react';
import { supportChatService, SupportMessage } from '../../services/supportChat.service';
import { supabase } from '../../lib/supabase';
import { playNotificationSound } from '../../utils/notificationSound';
import { LiveCallOverlay } from './LiveCallOverlay';
import { MessageList } from './components/MessageList';

interface ChatContainerProps {
    loanId: string;
    profileId: string; 
    operatorId?: string;
    senderType: 'CLIENT' | 'OPERATOR';
    placeholder?: string;
    clientName?: string;
    onFinish?: () => void;
}

const FINANCIAL_EMOJIS = ["💰", "💵", "💳", "📈", "📉", "💸", "🏦", "🧾", "✅", "⚠️"];

export const ChatContainer: React.FC<ChatContainerProps> = ({ loanId, profileId, operatorId, senderType, placeholder, clientName, onFinish }) => {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [showEmojis, setShowEmojis] = useState(false);
    const [errorState, setErrorState] = useState<string | null>(null);
    const [activeCall, setActiveCall] = useState<'voice' | 'video' | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!loanId) return;

        const loadMessages = async () => {
            try {
                const data = await supportChatService.getMessages(loanId);
                setMessages(data);
                await supportChatService.markAsRead(loanId, senderType);
            } catch (e) {
                setErrorState("Histórico indisponível.");
            }
        };
        loadMessages();

        const channel = supabase.channel(`chat-${loanId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'mensagens_suporte', 
                filter: `loan_id=eq.${loanId}` 
            }, payload => {
                const newMessage = payload.new as SupportMessage;
                setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
                if (newMessage.sender !== senderType) {
                    playNotificationSound();
                    supportChatService.markAsRead(loanId, senderType);
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [loanId, senderType]);

    useEffect(() => { 
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isRecording, audioBlob]);

    const handleSend = async (type: SupportMessage['type'] = 'text', file?: Blob | File) => {
        const textContent = type === 'text' ? inputText.trim() : `[${type.toUpperCase()}]`;
        if (!textContent && !file) return;
        
        setIsUploading(true);
        setErrorState(null);

        try {
            await supportChatService.sendMessage({ profileId, loanId, sender: senderType, operator_id: operatorId, text: textContent, type, file: file || undefined });
            if (type === 'text') setInputText('');
            setAudioBlob(null);
            setShowEmojis(false);
        } catch (e: any) { 
            setErrorState(e.message || "Erro no envio.");
        } finally { 
            setIsUploading(false); 
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                setAudioBlob(new Blob(chunks, { type: mediaRecorder.mimeType }));
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start();
            setIsRecording(true);
            setAudioBlob(null);
        } catch { alert("Microfone indisponível."); }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 w-full overflow-hidden relative">
            {activeCall && <LiveCallOverlay type={activeCall} onClose={() => setActiveCall(null)} loanId={loanId} clientName={clientName || 'Suporte'} />}

            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center shrink-0 z-20 shadow-lg">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center text-blue-500 font-black border border-slate-700 shrink-0">
                        {senderType === 'CLIENT' ? 'S' : (clientName?.[0] || 'C')}
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-black text-sm uppercase truncate">{senderType === 'CLIENT' ? 'Suporte Financeiro' : clientName}</p>
                        <p className="text-[9px] text-emerald-500 font-black uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sistema Ativo</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setActiveCall('voice'); handleSend('voice_call'); }} className="p-2 text-slate-400 hover:text-blue-500"><Phone size={18}/></button>
                    <button onClick={() => { setActiveCall('video'); handleSend('video_call'); }} className="p-2 text-slate-400 hover:text-indigo-500"><Video size={18}/></button>
                    {senderType === 'OPERATOR' && onFinish && <button onClick={onFinish} className="ml-2 px-3 py-1.5 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase">Finalizar</button>}
                </div>
            </div>

            {errorState && <div className="bg-rose-600 text-white p-2 text-center text-[10px] font-black uppercase flex items-center justify-center gap-2 z-30"><AlertCircle size={12}/> {errorState}</div>}

            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-slate-950/30" ref={scrollRef}>
                <MessageList messages={messages} senderType={senderType} isUploading={isUploading} />
                {isUploading && (
                    <div className="flex justify-end animate-pulse">
                        <div className="bg-blue-600/50 p-3 rounded-2xl flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin text-white"/><span className="text-[10px] text-white font-black uppercase">Processando...</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 z-20">
                {audioBlob && (
                    <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-500/30 p-3 rounded-2xl mb-4 animate-in slide-in-from-bottom-2">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white"><Mic size={18}/></div>
                        <div className="flex-1"><p className="text-[10px] text-blue-400 font-black uppercase">Áudio Capturado</p></div>
                        <button onClick={() => setAudioBlob(null)} className="p-2 text-rose-500"><Trash2 size={18}/></button>
                        <button onClick={() => handleSend('audio', audioBlob)} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg"><Send size={20}/></button>
                    </div>
                )}

                <div className={`flex gap-2 items-end ${audioBlob ? 'hidden' : 'flex'}`}>
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-1 flex items-center transition-all focus-within:border-blue-500/50">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-500 hover:text-blue-500"><Paperclip size={18}/></button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleSend(f.type.startsWith('image/') ? 'image' : 'file', f); }} />
                        <button onClick={() => setShowEmojis(!showEmojis)} className={`p-2.5 ${showEmojis ? 'text-blue-500' : 'text-slate-500'}`}><Smile size={18}/></button>
                        <textarea rows={1} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} className="flex-1 bg-transparent border-none text-white text-sm py-3 px-2 outline-none resize-none max-h-32 custom-scrollbar" placeholder={placeholder || "Escreva aqui..."} />
                        <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`p-3 rounded-xl transition-all ${isRecording ? 'text-white bg-rose-600 animate-pulse' : 'text-slate-500'}`}>{isRecording ? <StopCircle size={22}/> : <Mic size={22}/>}</button>
                    </div>
                    <button onClick={() => handleSend()} disabled={isUploading || (!inputText.trim() && !audioBlob)} className="p-4 bg-blue-600 text-white rounded-xl shadow-lg disabled:opacity-30 active:scale-95 transition-all"><Send size={20}/></button>
                </div>
            </div>
        </div>
    );
};
