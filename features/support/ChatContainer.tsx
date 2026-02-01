
import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, X, FileText, Loader2, Check, CheckCheck } from 'lucide-react';
import { supportChatService, SupportMessage } from '../../services/supportChat.service';
import { supabase } from '../../lib/supabase';
import { playNotificationSound } from '../../utils/notificationSound';

interface ChatContainerProps {
    loanId: string;
    profileId: string;
    senderType: 'CLIENT' | 'OPERATOR';
    placeholder?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ loanId, profileId, senderType, placeholder }) => {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);

    const loadMessages = async () => {
        try {
            const data = await supportChatService.getMessages(loanId);
            setMessages(data);
            await supportChatService.markAsRead(loanId, senderType);
        } catch (e) {}
    };

    useEffect(() => {
        loadMessages();
        // Escuta em tempo real para este chat específico
        const channel = supabase.channel(`chat-realtime-${loanId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'mensagens_suporte', 
                filter: `loan_id=eq.${loanId}` 
            }, payload => {
                const msg = payload.new as SupportMessage;
                setMessages(prev => [...prev, msg]);
                if (msg.sender !== senderType) {
                    playNotificationSound();
                    supportChatService.markAsRead(loanId, senderType);
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'mensagens_suporte',
                filter: `loan_id=eq.${loanId}`
            }, () => loadMessages())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [loanId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async (file?: File, type: any = 'text') => {
        if (!inputText.trim() && !file) return;
        setIsUploading(true);
        try {
            await supportChatService.sendMessage({
                profileId,
                loanId,
                sender: senderType,
                text: inputText,
                file,
                type
            });
            setInputText('');
        } catch (e) {
            alert("Falha no envio.");
        } finally {
            setIsUploading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                const file = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
                handleSend(file, 'audio');
            };
            mediaRecorder.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (e) { alert("Microfone não disponível."); }
    };

    const stopRecording = (cancel = false) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (cancel) { mediaRecorder.current!.onstop = () => {}; }
        mediaRecorder.current?.stop();
        setIsRecording(false);
        setRecordingTime(0);
    };

    const renderContent = (m: SupportMessage) => {
        if (m.type === 'image') return <img src={m.file_url} className="max-w-full rounded-xl mb-1 cursor-pointer hover:opacity-90" onClick={() => window.open(m.file_url)}/>;
        if (m.type === 'audio') return <audio controls src={m.file_url} className="max-w-full h-10 mb-1 scale-90 origin-left"/>;
        if (m.type === 'file') return <a href={m.file_url} target="_blank" className="flex items-center gap-2 underline mb-1 font-bold text-[10px] text-blue-400 uppercase"><FileText size={14}/> Ver Documento</a>;
        return <p className="leading-relaxed">{m.text}</p>;
    };

    return (
        <div className="flex flex-col h-full bg-slate-950/40">
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4" ref={scrollRef}>
                {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === senderType ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm relative group ${m.sender === senderType ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                            {renderContent(m)}
                            <div className="flex items-center justify-end gap-1 mt-1 opacity-50 text-[8px] font-black uppercase">
                                {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                {m.sender === senderType && (m.read ? <CheckCheck size={10} className="text-emerald-400"/> : <Check size={10}/>)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800">
                {isRecording ? (
                    <div className="flex items-center justify-between bg-rose-600 text-white p-3 rounded-2xl animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-white rounded-full animate-ping"/>
                            <span className="text-[10px] font-black uppercase">Gravando: {Math.floor(recordingTime/60)}:{(recordingTime%60).toString().padStart(2,'0')}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => stopRecording(true)} className="p-2 bg-rose-700 rounded-lg"><X size={14}/></button>
                            <button onClick={() => stopRecording(false)} className="p-2 bg-white text-rose-600 rounded-lg"><Check size={14}/></button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 items-center">
                        <label className="p-3 bg-slate-800 text-slate-400 rounded-xl cursor-pointer hover:text-white transition-all">
                            <Paperclip size={20}/>
                            <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleSend(e.target.files[0], e.target.files[0].type.startsWith('image/') ? 'image' : 'file')}/>
                        </label>
                        
                        <input 
                            type="text" 
                            value={inputText} 
                            onChange={e => setInputText(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSend()} 
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white text-xs outline-none focus:border-blue-500 transition-all" 
                            placeholder={placeholder || "Sua mensagem..."}
                        />

                        {inputText.trim() || isUploading ? (
                            <button onClick={() => handleSend()} disabled={isUploading} className="p-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg">
                                {isUploading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                            </button>
                        ) : (
                            <button onClick={startRecording} className="p-3.5 bg-slate-800 text-slate-400 rounded-xl hover:text-white hover:bg-blue-600 transition-all">
                                <Mic size={20}/>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
