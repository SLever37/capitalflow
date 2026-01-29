import { useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export const useToast = () => {
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const playBeep = (type: ToastType) => {
    // Beep curto só para erro/aviso (não atrapalhar UX)
    if (type !== 'error' && type !== 'warning') return;

    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = type === 'error' ? 880 : 660; // erro mais agudo
      gain.gain.value = 0.06; // volume baixo

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close?.();
      }, 120);
    } catch {
      // Se o browser bloquear áudio, só ignora.
    }
  };

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ msg, type });
    playBeep(type);
  };

  return { toast, showToast };
};