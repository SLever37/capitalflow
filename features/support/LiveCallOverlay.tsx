
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react';

interface LiveCallOverlayProps {
  onClose: () => void;
  type: 'voice' | 'video';
  loanId: string;
  clientName: string;
}

export const LiveCallOverlay: React.FC<LiveCallOverlayProps> = ({ onClose, type, loanId, clientName }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'voice');
  const [aiStatus, setAiStatus] = useState('Conectando...');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const sources = useRef(new Set<AudioBufferSourceNode>());
  const nextStartTime = useRef(0);

  // --- Helpers de Codificação/Decodificação ---
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: type === 'video' 
      });

      if (videoRef.current && type === 'video') {
        videoRef.current.srcObject = stream;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setAiStatus('Em Chamada');
            
            // Input Audio (Mic -> Gemini)
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(inputData) }));
            };
            
            source.connect(processor);
            processor.connect(audioContextRef.current.destination);

            // Input Video (Camera -> Gemini Frames)
            if (type === 'video') {
              frameIntervalRef.current = window.setInterval(() => {
                if (canvasRef.current && videoRef.current && !isVideoOff) {
                  const ctx = canvasRef.current.getContext('2d');
                  canvasRef.current.width = 320;
                  canvasRef.current.height = 240;
                  ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
                  const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                  sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
                }
              }, 1000); // 1 FPS para economia de banda
            }
          },
          onmessage: async (msg) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outAudioContextRef.current) {
              const buffer = await decodeAudioData(decode(audioData), outAudioContextRef.current);
              const source = outAudioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(outAudioContextRef.current.destination);
              
              const start = Math.max(nextStartTime.current, outAudioContextRef.current.currentTime);
              source.start(start);
              nextStartTime.current = start + buffer.duration;
              sources.current.add(source);
              source.onended = () => sources.current.delete(source);
            }

            if (msg.serverContent?.interrupted) {
              sources.current.forEach(s => s.stop());
              sources.current.clear();
              nextStartTime.current = 0;
            }
          },
          onerror: (e) => console.error("Live Error:", e),
          onclose: () => onClose()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `Você é um Agente de Suporte Financeiro da CapitalFlow atendendo o cliente ${clientName}. 
          Você tem voz amigável e profissional. Ajude-o com o contrato ${loanId}. Seja conciso.`
        }
      });

      outAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error(err);
      alert("Erro ao iniciar hardware de chamada.");
      onClose();
    }
  };

  useEffect(() => {
    startSession();
    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (outAudioContextRef.current) outAudioContextRef.current.close();
      if (sessionRef.current) sessionRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Background Glow */}
      <div className={`absolute inset-0 bg-blue-600/10 transition-opacity duration-1000 ${isConnecting ? 'opacity-0' : 'opacity-100'}`} />

      {/* Video Display / Avatar Area */}
      <div className="relative w-full max-w-lg aspect-video rounded-[3rem] overflow-hidden bg-slate-900 border-4 border-slate-800 shadow-2xl flex items-center justify-center">
        {type === 'video' && !isVideoOff ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className={`w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/40 ${!isConnecting && 'animate-pulse'}`}>
              <Mic size={48} className="text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{clientName}</h2>
              <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest">{aiStatus}</p>
            </div>
          </div>
        )}

        {isConnecting && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Enviando Token Seguro...</p>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="mt-12 flex items-center gap-6 z-10">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`p-6 rounded-3xl transition-all ${isMuted ? 'bg-rose-600 text-white shadow-rose-900/40' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          {isMuted ? <MicOff /> : <Mic />}
        </button>

        <button 
          onClick={onClose} 
          className="p-8 rounded-full bg-rose-600 text-white shadow-2xl shadow-rose-900/40 hover:scale-110 active:scale-95 transition-all"
        >
          <PhoneOff size={32} />
        </button>

        {type === 'video' && (
          <button 
            onClick={() => setIsVideoOff(!isVideoOff)} 
            className={`p-6 rounded-3xl transition-all ${isVideoOff ? 'bg-rose-600 text-white shadow-rose-900/40' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            {isVideoOff ? <VideoOff /> : <Video />}
          </button>
        )}
      </div>

      <p className="mt-8 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">Criptografia de Ponta a Ponta IA</p>
    </div>
  );
};
