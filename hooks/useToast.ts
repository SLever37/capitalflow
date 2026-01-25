
import { useState, useEffect } from 'react';

export const useToast = () => {
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info' | 'warning'} | null>(null);

  useEffect(() => {
    if (toast) { 
      const timer = setTimeout(() => setToast(null), 4000); 
      return () => clearTimeout(timer); 
    }
  }, [toast]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => { 
    setToast({ msg, type }); 
  };

  return { toast, showToast };
};
