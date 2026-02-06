
import React from 'react';
import { MessageSquare, FileEdit, Link as LinkIcon, Upload, FileText } from 'lucide-react';

interface QuickActionsProps {
    hasNotes: boolean;
    onMessage: (e: React.MouseEvent) => void;
    onNote: (e: React.MouseEvent) => void;
    onPortalLink: (e: React.MouseEvent) => void;
    onViewDoc: (e: React.MouseEvent, url: string) => void;
    onUploadPromissoria?: (e: React.MouseEvent) => void;
    onUploadDoc: (e: React.MouseEvent) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
    hasNotes, onMessage, onNote, onPortalLink, onViewDoc, onUploadPromissoria, onUploadDoc
}) => {
    return (
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
             <button onClick={(e) => { e.stopPropagation(); onMessage(e); }} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all">
                <MessageSquare size={14} /> WhatsApp
             </button>
             
             <button onClick={(e) => { e.stopPropagation(); onPortalLink(e); }} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all">
                <LinkIcon size={14} /> Portal Link
             </button>

             {onUploadPromissoria && (
                 <button onClick={(e) => { e.stopPropagation(); onUploadPromissoria(e); }} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600/10 text-purple-500 hover:bg-purple-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all">
                    <FileText size={14} /> Promissória
                 </button>
             )}

             <button onClick={(e) => { e.stopPropagation(); onUploadDoc(e); }} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all">
                <Upload size={14} /> Anexar
             </button>

             <button onClick={(e) => { e.stopPropagation(); onNote(e); }} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${hasNotes ? 'bg-amber-600/10 text-amber-500 hover:bg-amber-600 hover:text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                <FileEdit size={14} /> Notas {hasNotes && '(1)'}
             </button>
        </div>
    );
};
