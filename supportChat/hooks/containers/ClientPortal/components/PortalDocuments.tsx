
import React from 'react';
import { Paperclip, FileText, Download } from 'lucide-react';

interface PortalDocumentsProps {
    documents: any[];
}

export const PortalDocuments: React.FC<PortalDocumentsProps> = ({ documents }) => {
    if (!documents || documents.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-white uppercase flex items-center gap-2">
                    <Paperclip size={14} className="text-blue-500"/> Documentos Anexados
                </h3>
            </div>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                {documents.map((doc: any) => (
                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                <FileText size={16}/>
                            </div>
                            <span className="text-xs text-white font-bold truncate max-w-[150px]">{doc.name}</span>
                        </div>
                        <Download size={14} className="text-slate-500"/>
                    </a>
                ))}
            </div>
        </div>
    );
};
