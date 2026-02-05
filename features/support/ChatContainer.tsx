
import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, X, FileText, Loader2, Check, CheckCheck, Play, StopCircle, Video, Phone, Smile, Download, Trash2, AlertCircle } from 'lucide-react';
import { supportChatService, SupportMessage } from '../../services/supportChat.service';
import { supabase } from '../../lib/supabase';
import { playNotificationSound } from '../../utils/notificationSound';
import { LiveCallOverlay } from './LiveCallOverlay';

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
                console.error("Falha ao carregar chat:", e);
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
                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
                if (newMessage.sender !== senderType) {
                    playNotificationSound();
                    supportChatService.markAsRead(loanId, senderType);
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [loanId, senderType]);

    useEffect(() => { 
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isRecording, audioBlob]);

    const handleSend = async (type: SupportMessage['type'] = 'text', file?: Blob | File) => {
        const textContent = type === 'text' ? inputText.trim() : `[${type.toUpperCase()}]`;
        if (!textContent && !file) return;
        
        if (!loanId || !profileId) {
            setErrorState("Sessão expirada. Recarregue a página.");
            return;
        }

        setIsUploading(true);
        setErrorState(null);

        try {
            await supportChatService.sendMessage({
                profileId,
                loanId,
                sender: senderType,
                operator_id: operatorId,
                text: textContent,
                type,
                file: file || undefined
            });

            if (type === 'text') setInputText('');
            setAudioBlob(null);
            setShowEmojis(false);
            
        } catch (e: any) { 
            console.error("Erro no envio:", e);
            const msg = e.message || "Tente novamente.";
            setErrorState(`Falha: ${msg.includes('security policy') ? 'Acesso Negado (RLS)' : msg}`);
            setTimeout(() => setErrorState(null), 5000);
        } finally { 
            setIsUploading(false); 
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' 
                : 'audio/mp4';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];
            
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            setIsRecording(true);
            setAudioBlob(null);
        } catch (err) {
            alert("Não foi possível acessar o microfone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const type = file.type.startsWith('image/') ? 'image' : 'file';
        handleSend(type, file);
    };

    const toggleCall = (type: 'video_call' | 'voice_call') => {
        setActiveCall(type === 'video_call' ? 'video' : 'voice');
        handleSend(type);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 w-full overflow-hidden relative">
            {/* Live Call UI Overlay */}
            {activeCall && (
              <LiveCallOverlay 
                type={activeCall} 
                onClose={() => setActiveCall(null)} 
                loanId={loanId}
                clientName={clientName || 'Suporte'}
              />
            )}

            {/* Header */}
            <div className="bg-slate-950 p-3 sm:p-4 border-b border-slate-800 flex justify-between items-center shrink-0 z-20 shadow-lg">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 bg-slate-800 rounded-xl flex items-center justify-center text-blue-500 font-black border border-slate-700 shrink-0">
                        {senderType === 'CLIENT' ? 'S' : (clientName?.[0] || 'C')}
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-black text-xs sm:text-sm uppercase truncate mb-0.5">
                            {senderType === 'CLIENT' ? 'Suporte Financeiro' : clientName}
                        </p>
                        <p className="text-[9px] text-emerald-500 font-black uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sistema Ativo
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => toggleCall('voice_call')} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Phone size={18}/></button>
                    <button onClick={() => toggleCall('video_call')} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><Video size={18}/></button>
                    {senderType === 'OPERATOR' && onFinish && (
                        <button onClick={onFinish} className="ml-1 sm:ml-2 px-3 py-1.5 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase tracking-tighter">Finalizar</button>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {errorState && (
                <div className="bg-rose-600 text-white p-2 text-center text-[10px] font-black uppercase animate-in slide-in-from-top flex items-center justify-center gap-2 z-30">
                    <AlertCircle size={12}/> {errorState}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4 bg-slate-950/30" ref={scrollRef}>
                {messages.length === 0 && !isUploading && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                        <Smile size={64} className="text-slate-500 mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest text-white text-center">Inicie a conversa enviando uma mensagem</p>
                    </div>
                )}
                {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === senderType ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] sm:max-w-[75%] p-3.5 rounded-2xl shadow-xl min-w-[60px] break-words ${
                            m.type === 'system' ? 'bg-slate-950 border border-slate-800 text-slate-500 text-center mx-auto text-[10px]' :
                            m.sender === senderType ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                        }`}>
                            {m.type === 'text' || m.type === 'system' ? (
                                <p className="text-xs sm:text-sm font-medium leading-relaxed">{m.text}</p>
                            ) : m.type === 'image' ? (
                                <img src={m.file_url} className="rounded-xl max-w-full h-auto cursor-pointer border border-white/5" onClick={() => window.open(m.file_url)} alt="Anexo"/>
                            ) : m.type === 'audio' ? (
                                <div className="flex items-center gap-3 min-w-[200px] py-1">
                                    <button onClick={() => new Audio(m.file_url).play()} className="p-2.5 bg-white/20 rounded-full hover:bg-white/30 transition-transform active:scale-90"><Play size={14} fill="white"/></button>
                                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-white w-full rounded-full opacity-20"></div>
                                    </div>
                                    <a href={m.file_url} download className="text-white/40 hover:text-white transition-colors"><Download size={14}/></a>
                                </div>
                            ) : (m.type === 'video_call' || m.type === 'voice_call') ? (
                                <div className="flex flex-col items-center gap-2 p-2 text-center opacity-80">
                                    <div className="p-3 bg-white/10 rounded-full">{m.type === 'video_call' ? <Video size={20}/> : <Phone size={20}/>}</div>
                                    <p className="text-[9px] font-black uppercase tracking-widest">Sinalização de Chamada</p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-2 bg-black/10 rounded-xl">
                                    <FileText size={24} className="text-blue-200 shrink-0"/>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold truncate text-white">Documento / Anexo</p>
                                        <a href={m.file_url} target="_blank" rel="noreferrer" className="text-[9px] uppercase font-black text-blue-200 hover:underline">Visualizar</a>
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-end gap-1.5 mt-2 opacity-40 text-[8px] font-black uppercase">
                                {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                {m.sender === senderType && (m.read ? <CheckCheck size={10} className="text-emerald-400"/> : <Check size={10}/>)}
                            </div>
                        </div>
                    </div>
                ))}
                {isUploading && (
                    <div className="flex justify-end animate-pulse">
                        <div className="bg-blue-600/50 p-3 rounded-2xl rounded-tr-none flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin text-white"/>
                            <span className="text-[10px] text-white font-black uppercase">Processando...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Tools */}
            <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0 z-20">
                {audioBlob && (
                    <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-500/30 p-3 rounded-2xl mb-4 animate-in slide-in-from-bottom-2">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white">
                            <Mic size={18}/>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-blue-400 font-black uppercase">Áudio Capturado</p>
                            <p className="text-[9px] text-slate-500 uppercase font-bold">Pronto para enviar</p>
                        </div>
                        <button onClick={() => setAudioBlob(null)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg">
                            <Trash2 size={18}/>
                        </button>
                        <button onClick={() => handleSend('audio', audioBlob)} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 transition-all">
                            <Send size={20}/>
                        </button>
                    </div>
                )}

                {showEmojis && (
                    <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1">
                        {FINANCIAL_EMOJIS.map(e => (
                            <button key={e} onClick={() => setInputText(p => p + e)} className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-lg active:scale-90 transition-transform">{e}</button>
                        ))}
                    </div>
                )}

                <div className={`flex gap-2 items-end ${audioBlob ? 'hidden' : 'flex'}`}>
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-1 flex items-center transition-all focus-within:border-blue-500/50">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-500 hover:text-blue-500"><Paperclip size={18}/></button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                        
                        <button onClick={() => setShowEmojis(!showEmojis)} className={`p-2.5 transition-colors ${showEmojis ? 'text-blue-500' : 'text-slate-500'}`}><Smile size={18}/></button>

                        <textarea 
                            rows={1}
                            value={inputText} 
                            onChange={e => setInputText(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                            className="flex-1 bg-transparent border-none text-white text-sm py-3 px-2 outline-none resize-none max-h-32 custom-scrollbar" 
                            placeholder={placeholder || "Escreva aqui..."}
                        />
                        
                        <button 
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                            className={`p-3 transition-all rounded-xl ${isRecording ? 'text-white animate-pulse bg-rose-600 shadow-lg shadow-rose-900/40' : 'text-slate-500 hover:text-blue-500'}`}
                        >
                            {isRecording ? <StopCircle size={22}/> : <Mic size={22}/>}
                        </button>
                    </div>

                    <button 
                        onClick={() => handleSend()} 
                        disabled={isUploading || (!inputText.trim() && !audioBlob)} 
                        className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-30 active:scale-95 shrink-0 shadow-lg shadow-blue-900/20"
                    >
                        {isUploading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                    </button>
                </div>
                {isRecording && <p className="text-[9px] text-rose-500 font-black uppercase text-center mt-2 animate-bounce tracking-widest italic">Capturando Voz...</p>}
            </div>
        </div>
    );
};
