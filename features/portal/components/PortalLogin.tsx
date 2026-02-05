
import React from 'react';
import { RefreshCw, KeyRound, ArrowRight } from 'lucide-react';

interface PortalLoginProps {
    loginIdentifier: string;
    setLoginIdentifier: (v: string) => void;
    handleLogin: () => void;
    isLoading: boolean;
    selectedLoanId: string;
}

export const PortalLogin: React.FC<PortalLoginProps> = ({
    loginIdentifier, setLoginIdentifier, handleLogin, isLoading, selectedLoanId
}) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleLogin();
    };

    return (
        <div className="px-8 pb-10 space-y-6">
            <div className="space-y-4">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 focus-within:border-blue-500 transition-all shadow-inner">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <KeyRound size={12}/> Código de Acesso
                    </label>
                    <input 
                        value={loginIdentifier} 
                        onChange={e => setLoginIdentifier(e.target.value)} 
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent text-white text-base font-bold outline-none placeholder:text-slate-700" 
                        placeholder="Informe seu Código" 
                        autoFocus
                    />
                </div>
            </div>

            <button 
                onClick={handleLogin} 
                disabled={isLoading || !loginIdentifier.trim()} 
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
                {isLoading ? <RefreshCw className="animate-spin" size={18}/> : <>Entrar Agora <ArrowRight size={16}/></>}
            </button>
            
            <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                Acesso Seguro • Ref: {selectedLoanId.slice(0, 8)}
            </p>
        </div>
    );
};
