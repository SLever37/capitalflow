
import React from 'react';
import { History, FileCheck, ExternalLink, Clock } from 'lucide-react';

interface PortalUploadsHistoryProps {
    signals: any[];
}

export const PortalUploadsHistory: React.FC<PortalUploadsHistoryProps> = ({ signals }) => {
    // Filtra apenas uploads (ENVIO_DOC ou PAGAR_PIX com comprovante)
    const uploads = signals.filter(s => s.comprovante_url && (s.tipo_intencao === 'ENVIO_DOC' || s.tipo_intencao === 'PAGAR_PIX'));

    if (uploads.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-white uppercase flex items-center gap-2">
                    <History size={14} className="text-slate-500"/> Meus Envios
                </h3>
            </div>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                    {uploads.map((signal: any) => (
                        <div key={signal.id} className="flex items-center justify-between p-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${signal.status === 'APROVADO' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                                    <FileCheck size={16}/>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate max-w-[150px]">
                                        {signal.tipo_intencao === 'PAGAR_PIX' ? 'Comprovante Pagamento' : 'Documento Diverso'}
                                    </p>
                                    <p className="text-[9px] text-slate-500 flex items-center gap-1">
                                        <Clock size={8}/> {new Date(signal.created_at).toLocaleDateString()}
                                        <span className={`font-bold ${signal.status === 'APROVADO' ? 'text-emerald-500' : 'text-amber-500'}`}>• {signal.status}</span>
                                    </p>
                                </div>
                            </div>
                            <a href={signal.comprovante_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 hover:text-blue-400 transition-colors">
                                <ExternalLink size={14}/>
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
