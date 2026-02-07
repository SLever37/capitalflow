
import { useState, useRef, useEffect } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const cancelFlagRef = useRef(false);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  const pickMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4' 
    ];
    for (const m of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
        return m;
      }
    }
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = pickMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      cancelFlagRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(); 
      setIsRecording(true);
      setRecordMs(0);

      timerRef.current = window.setInterval(() => {
        setRecordMs(prev => prev + 1000);
      }, 1000);

    } catch (err: any) {
      // ✅ FIX: Tratamento silencioso para erro "Requested device not found"
      cleanup();
      
      let msg = "Não foi possível acessar o microfone.";
      if (err.name === 'NotFoundError' || err.message?.includes('device not found') || err.message?.includes('Requested device not found')) {
          msg = "Nenhum microfone detectado neste dispositivo.";
          console.warn("AudioRecorder:", msg);
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = "Permissão de microfone negada. Verifique as configurações do site.";
          console.warn("AudioRecorder:", msg);
      } else {
          console.error("Erro ao iniciar gravação:", err);
      }
      
      alert(msg);
    }
  };

  const stopRecording = (): Promise<{ audioFile: File, duration: number } | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        cleanup();
        setIsRecording(false);

        if (cancelFlagRef.current) {
          resolve(null);
          return;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: mimeType });
        
        resolve({ audioFile: file, duration: recordMs });
      };

      recorder.stop();
    });
  };

  const cancelRecording = () => {
    cancelFlagRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
      setIsRecording(false);
    }
  };

  return {
    isRecording,
    recordMs,
    startRecording,
    stopRecording,
    cancelRecording
  };
};
