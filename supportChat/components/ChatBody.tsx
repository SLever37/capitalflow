
import React from 'react';
import { SupportMessage } from '../types/supportChat.types';
import { AudioPlayer } from './AudioPlayer';
import { FileText, MapPin, Check, CheckCheck } from 'lucide-react';

interface ChatBodyProps {
    messages: SupportMessage[];
    currentUserId: string;
    scrollRef: React.RefObject<HTMLDivElement>;
}

export const ChatBody: React.FC<ChatBodyProps> = ({ messages, currentUserId, scrollRef }) => {
    
    const renderContent = (msg: SupportMessage) => {
        if (msg.type === 'system') return <span className="text-[10px] italic opacity-80">{msg.content}</span>;
        
        switch (msg.type) {
            case 'image':
                return <img src={msg.file_url || msg.content} alt="Anexo" className="max-w-full rounded-lg border border-white/10 mt-1 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.file_url || msg.content, '_blank')} />;
            case 'audio':
                return <AudioPlayer src={msg.file_url || msg.content} duration={msg.metadata?.duration} />;
            case 'file':
                return (
                    <a href={msg.file_url} target="_blank" className="flex items-center gap-3 bg-black/20 p-3 rounded-lg hover:bg-black/30 transition-colors">
                        <div className="p-2 bg-white/10 rounded"><FileText size={20}/></div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold truncate max-w-[150px]">{msg.content}</p>
                            <p className="text-[9px] opacity-70 uppercase">Download</p>
                        </div>
                    </a>
                );
            case 'location':
                return (
                    <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg">
                        <MapPin className="text-rose-500" size={16}/>
                        <span className="text-xs">Localização Compartilhada</span>
                    </div>
                );
            default: // Text
                return <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
        }
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-900/50" ref={scrollRef}>
            {messages.map((msg, idx) => {
                const isMe = msg.profile_id === currentUserId;
                const isSystem = msg.type === 'system' || msg.sender_type === 'SYSTEM';

                if (isSystem) {
                    return (
                        <div key={msg.id} className="flex justify-center my-4">
                            <div className="bg-slate-800/50 border border-slate-800 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                                {msg.content}
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div 
                            className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl shadow-sm relative group
                            ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}
                        >
                            {renderContent(msg)}
                            
                            <div className={`flex items-center gap-1 mt-1.5 ${isMe ? 'justify-end text-blue-200' : 'justify-start text-slate-500'}`}>
                                <span className="text-[9px] font-mono opacity-80">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && (
                                    msg.read_at ? <CheckCheck size={12}/> : <Check size={12}/>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};