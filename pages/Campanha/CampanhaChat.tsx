import React from 'react';
import { Loader2 } from 'lucide-react';

export const CampanhaChat: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 border border-blue-600/20 animate-pulse">
        <Loader2 className="text-blue-500 animate-spin" size={32} />
      </div>
      <h1 className="text-2xl font-black text-white uppercase mb-2">Analisando Perfil...</h1>
      <p className="text-slate-400 text-sm max-w-xs mx-auto">
        Estamos conectando você a um especialista. (Parte 2 - Em Construção)
      </p>
    </div>
  );
};
