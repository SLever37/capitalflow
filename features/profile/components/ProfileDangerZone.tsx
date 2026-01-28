
import React from 'react';
import { AlertTriangle, RotateCcw, Trash2, ShieldAlert } from 'lucide-react';

interface ProfileDangerZoneProps {
    onResetData: () => void;
    onDeleteAccount: () => void;
}

export const ProfileDangerZone: React.FC<ProfileDangerZoneProps> = ({ onResetData, onDeleteAccount }) => {
    return (
        <div className="animate-in slide-in-from-right space-y-6">
            <div className="bg-rose-950/20 border border-rose-500/30 p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    <ShieldAlert size={120} className="text-rose-500"/>
                </div>
                
                <h3 className="text-rose-500 font-black uppercase text-sm mb-4 flex items-center gap-2 relative z-10">
                    <AlertTriangle size={18} /> Zona de Risco e Exclusão
                </h3>
                
                <div className="bg-rose-950/40 p-4 rounded-xl border border-rose-500/20 mb-6 relative z-10">
                    <p className="text-xs text-rose-200/90 font-medium leading-relaxed">
                        <strong className="uppercase">Atenção:</strong> As ações abaixo são <b>destrutivas e irreversíveis</b>. 
                        Ao prosseguir, você concorda que os dados apagados não poderão ser recuperados nem pelo suporte técnico.
                    </p>
                </div>

                <div className="space-y-4 relative z-10">
                    {/* Reset Data Button */}
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-rose-500/10 gap-4 hover:border-rose-500/30 transition-colors">
                        <div className="text-center sm:text-left">
                            <p className="font-bold text-white text-xs uppercase mb-1 flex items-center gap-2 justify-center sm:justify-start">
                                <RotateCcw size={12} className="text-rose-400"/> Zerar Banco de Dados
                            </p>
                            <p className="text-[10px] text-slate-400 leading-tight">
                                Remove todos os clientes, contratos e histórico.<br/>
                                Mantém seu usuário, senha e configurações de perfil.
                            </p>
                        </div>
                        <button 
                            onClick={onResetData} 
                            className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-rose-900/30 active:scale-95"
                        >
                            Zerar Tudo
                        </button>
                    </div>

                    {/* Delete Account Button */}
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-rose-500/10 gap-4 hover:border-rose-500/30 transition-colors">
                        <div className="text-center sm:text-left">
                            <p className="font-bold text-white text-xs uppercase mb-1 flex items-center gap-2 justify-center sm:justify-start">
                                <Trash2 size={12} className="text-rose-400"/> Excluir Minha Conta
                            </p>
                            <p className="text-[10px] text-slate-400 leading-tight">
                                Remove seu login, assinatura e todos os dados.<br/>
                                Você será desconectado imediatamente.
                            </p>
                        </div>
                        <button 
                            onClick={onDeleteAccount} 
                            className="px-5 py-3 bg-slate-950 text-rose-500 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
                        >
                            Apagar Usuário
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
