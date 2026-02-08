
import React from 'react';
import { Phone, Video, X, User, Lock, Unlock, Minus } from 'lucide-react';
import { TicketStatus } from '../types/supportChat.types';

interface ChatHeaderProps {
    clientName: string;
    status?: TicketStatus;
    onClose: () => void;
    onStartCall: (type: 'AUDIO' | 'VIDEO') => void;
    onToggleStatus: () => void;
    isOnline?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ clientName, status, onClose, onStartCall, onToggleStatus, isOnline }) => {
    return (
        <div className="h-16 px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                        <User size={20} className="text-slate-400"/>
                    </div>
                    {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>}
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide">{clientName}</h3>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                            {status === 'OPEN' ? 'Em Atendimento' : 'Finalizado'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {status === 'OPEN' && (
                    <>
                        <button onClick={() => onStartCall('AUDIO')} className="p-2.5 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="Ligação de Voz">
                            <Phone size={18}/>
                        </button>
                        <button onClick={() => onStartCall('VIDEO')} className="p-2.5 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="Chamada de Vídeo">
                            <Video size={18}/>
                        </button>
                    </>
                )}
                
                <div className="h-6 w-px bg-slate-800 mx-1"></div>

                <button 
                    onClick={onToggleStatus}
                    className={`p-2.5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase ${status === 'OPEN' ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                >
                    {status === 'OPEN' ? <><Lock size={14}/> Encerrar</> : <><Unlock size={14}/> Reabrir</>}
                </button>

                <button onClick={onClose} className="p-2.5 bg-slate-900 text-slate-500 hover:text-white rounded-xl ml-2">
                    <X size={18}/>
                </button>
            </div>
        </div>
    );
};