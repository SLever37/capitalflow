
import React, { useEffect, useRef } from 'react';
import { PhoneOff, Phone, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { CallState } from '../types/supportChat.types';

interface CallControlsProps {
    callState: CallState;
    onAnswer: () => void;
    onHangup: () => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
}

export const CallControls: React.FC<CallControlsProps> = ({ callState, onAnswer, onHangup, localStream, remoteStream }) => {
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [remoteStream, localStream]);

    if (callState.status === 'IDLE') return null;

    return (
        <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center animate-in fade-in duration-300">
            {/* VIDEO AREA */}
            <div className="relative w-full max-w-4xl flex-1 flex items-center justify-center p-4">
                {callState.type === 'VIDEO' ? (
                    <>
                        {/* Remote Video */}
                        <div className="w-full h-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative">
                            {remoteStream ? (
                                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-500 animate-pulse">Conectando...</div>
                            )}
                        </div>
                        {/* Local Video PIP */}
                        <div className="absolute bottom-8 right-8 w-40 h-60 bg-slate-800 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-xl">
                            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        </div>
                    </>
                ) : (
                    // Audio Only Interface
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center animate-pulse">
                            <Mic size={48} className="text-white"/>
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase">{callState.status === 'RINGING' ? 'Chamada Entrando...' : 'Em Chamada de Voz'}</h2>
                        <audio ref={remoteVideoRef} autoPlay />
                    </div>
                )}
            </div>

            {/* CONTROLS */}
            <div className="h-24 w-full flex items-center justify-center gap-8 pb-8">
                {callState.status === 'RINGING' ? (
                    <>
                        <button onClick={onAnswer} className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg shadow-emerald-500/40 animate-bounce">
                            <Phone size={32}/>
                        </button>
                        <button onClick={onHangup} className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg shadow-rose-500/40">
                            <PhoneOff size={32}/>
                        </button>
                    </>
                ) : (
                    <button onClick={onHangup} className="w-16 h-16 bg-rose-600 rounded-full flex items-center justify-center text-white hover:bg-rose-500 transition-colors shadow-xl">
                        <PhoneOff size={32}/>
                    </button>
                )}
            </div>
        </div>
    );
};
