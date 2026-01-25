
import React from 'react';
import { ExternalLink, RefreshCw, UserCheck, KeyRound } from 'lucide-react';

interface PortalLoginProps {
    loginIdentifier: string;
    setLoginIdentifier: (v: string) => void;
    loginCode: string;
    setLoginCode: (v: string) => void;
    handleLogin: () => void;
    isLoading: boolean;
    selectedLoanId: string;
}

export const PortalLogin: React.FC<PortalLoginProps> = ({
    loginIdentifier, setLoginIdentifier, loginCode, setLoginCode, handleLogin, isLoading, selectedLoanId
}) => {
    return (
        <div className="px-8 pb-10 space-y-6">
            <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 focus-within:border-blue-500 transition-all">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <UserCheck size={12}/> CPF, CNPJ ou Telefone
                    </label>
                    <input 
                        value={loginIdentifier} 
                        onChange={e => setLoginIdentifier(e.target.value)} 
                        className="w-full bg-transparent text-white text-sm font-bold outline-none placeholder:text-slate-700" 
                        placeholder="Ex: 000.000.000-00" 
                    />
                </div>
                
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 focus-within:border-blue-500 transition-all">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <KeyRound size={12}/> Código de Acesso (4 dígitos)
                    </label>
                    <input 
                        value={loginCode} 
                        onChange={e => setLoginCode(e.target.value)} 
                        className="w-full bg-transparent text-white text-lg font-black tracking-[0.5em] outline-none placeholder:text-slate-700" 
                        placeholder="****" 
                        inputMode="numeric" 
                        maxLength={4} 
                    />
                </div>
            </div>

            <button 
                onClick={handleLogin} 
                disabled={isLoading} 
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
                {isLoading ? <RefreshCw className="animate-spin" size={18}/> : <>Acessar Minha Conta <ExternalLink size={16}/></>}
            </button>
            
            <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                Segurança CapitalFlow • Ref: {selectedLoanId.slice(0, 8)}
            </p>
        </div>
    );
};
