
import { useEffect, useRef, useState } from 'react';

type RecorderState = 'idle' | 'recording' | 'stopped' | 'error';

export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [state, setState] = useState<RecorderState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanupStream = () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
      cleanupStream();
    };
  }, []);

  const pickMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];
    for (const t of candidates) {
      if ((window as any).MediaRecorder?.isTypeSupported?.(t)) return t;
    }
    return '';
  };

  const startRecording = async () => {
    setError(null);
    setAudioBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstart = () => {
        setState('recording');
        setIsRecording(true);
      };

      recorder.onstop = () => {
        setIsRecording(false);
        setState('stopped');

        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });

        setAudioBlob(blob);
        cleanupStream();
      };

      recorder.onerror = () => {
        setIsRecording(false);
        setState('error');
        setError('Falha ao gravar áudio.');
        cleanupStream();
      };

      recorder.start();
    } catch (e: any) {
      setState('error');
      setIsRecording(false);
      
      // ✅ FIX: Tratamento silencioso para erro de hardware
      let msg = 'Falha ao acessar microfone.';
      if (e.name === 'NotFoundError' || e.message?.includes('device not found') || e.message?.includes('Requested device not found')) {
          msg = 'Nenhum microfone detectado.';
          console.warn("AudioRecorder:", msg);
      } else if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          msg = 'Permissão para microfone negada.';
          console.warn("AudioRecorder:", msg);
      }
      setError(msg);
      
      cleanupStream();
    }
  };

  const stopRecording = () => {
    setError(null);
    const r = mediaRecorderRef.current;
    if (!r) return;

    try {
      if (r.state !== 'inactive') r.stop();
    } catch (e: any) {
      setState('error');
      setIsRecording(false);
      setError(e?.message || 'Falha ao parar gravação.');
      cleanupStream();
    }
  };

  const discardAudio = () => {
    setAudioBlob(null);
    setError(null);
    setState('idle');
    chunksRef.current = [];
  };

  return {
    state,
    isRecording,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    discardAudio
  };
}
