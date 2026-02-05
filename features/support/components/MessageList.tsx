
import React from 'react';
import { SupportMessage } from '../../../services/supportChat.service';
import { Play, Download, FileText, CheckCheck, Check, Smile } from 'lucide-react';

interface MessageListProps {
    messages: SupportMessage[];
    senderType: 'CLIENT' | 'OPERATOR';
    isUploading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, senderType, isUploading }) => {
    if (messages.length === 0 && !isUploading) {
        return (
            <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                <Smile size={64} className="text-slate-500 mb-2" />
                <p className="text-xs font-black uppercase tracking-widest text-white text-center">Inicie a conversa enviando uma mensagem</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
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
        </div>
    );
};
