
import React from 'react';
import { ArrowLeft, User, Scale, MapPin, Building, Lock } from 'lucide-react';
import { UserProfile } from '../../../types';

interface LegalProfileViewProps {
    activeUser: UserProfile | null;
    onBack: () => void;
}

export const LegalProfileView: React.FC<LegalProfileViewProps> = ({ activeUser, onBack }) => {
    if (!activeUser) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={20}/>
                </button>
                <div>
                    <h2 className="text-xl font-black text-white uppercase flex items-center gap-2">
                        <Scale className="text-indigo-400" size={24}/> Perfil Jurídico
                    </h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Identificação e Prerrogativas do Credor</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] max-w-2xl">
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Building size={20}/></div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Nome Jurídico / Razão</p>
                            <p className="text-white font-bold">{activeUser.fullName || activeUser.businessName || 'Não informado'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><Lock size={20}/></div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">CPF / CNPJ</p>
                            <p className="text-white font-bold">{activeUser.document || 'Não informado'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                        <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><MapPin size={20}/></div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Praça de Pagamento (Foro)</p>
                            <p className="text-white font-bold">{activeUser.city || 'Manaus'} - {activeUser.state || 'AM'}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl">
                        <p className="text-xs text-blue-300 leading-relaxed font-medium">
                            <span className="font-black uppercase text-[10px] block mb-1">Nota Legal:</span>
                            Estes dados são utilizados automaticamente na geração dos títulos executivos e termos de quitação. Certifique-se de que estão corretos conforme seus documentos oficiais.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
