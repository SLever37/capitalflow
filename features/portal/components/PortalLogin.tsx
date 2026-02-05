
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface PortalLoginProps {
    loginIdentifier: string;
    setLoginIdentifier: (v: string) => void;
    handleLogin: () => void;
    isLoading: boolean;
    selectedLoanId: string;
}

export const PortalLogin: React.FC<PortalLoginProps> = () => {
    return (
        <div className="px-8 pb-10 space-y-6 text-center">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center gap-4">
                <AlertCircle className="text-slate-500" size={32} />
                <div className="space-y-2">
                    <p className="text-sm font-bold text-white uppercase">Acesso Exclusivo via Link</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Para acessar suas informações, utilize o link seguro enviado pelo seu gestor.
                    </p>
                </div>
            </div>
            
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                Sistema CapitalFlow • Segurança SSL
            </p>
        </div>
    );
};
