
import React from 'react';
import { X } from 'lucide-react';

export const Modal: React.FC<{onClose: () => void, title: string, children: React.ReactNode}> = ({onClose, title, children}) => (
  <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative flex flex-col max-h-[90dvh]">
      <div className="flex justify-between items-center mb-6 sm:mb-10 flex-shrink-0">
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white pr-4 leading-tight">{title}</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-all p-2 sm:p-3 bg-slate-800 rounded-2xl flex-shrink-0"><X size={20}/></button>
      </div>
      <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
        {children}
      </div>
    </div>
  </div>
);
