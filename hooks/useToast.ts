import { useState, useEffect, useRef, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export const useToast = () => {
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 🔔 Controle de timeout seguro
  useEffect(() => {
    if (!toast) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast]);

  const playBeep = useCallback((type: ToastType) => {
    if (type !== 'error' && type !== 'warning') return;

    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      // 🔒 Reutiliza contexto (evita erro de limite no Chrome)
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = type === 'error' ? 880 : 660;
      gain.gain.value = 0.05;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // navegador pode bloquear áudio
    }
  }, []);

  const showToast = useCallback(
    (msg: string, type: ToastType = 'success') => {
      setToast({ msg, type });
      playBeep(type);
    },
    [playBeep]
  );

  return { toast, showToast };
};