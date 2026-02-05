
import React, { useState, useEffect } from 'react';
import { HelpCircle, TrendingUp, User, KeyRound, Loader2, X, ChevronRight, Eye, EyeOff, UserPlus, ShieldCheck, Mail, Lock, ArrowRight, UserCheck, Building, MessageSquare } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { maskDocument, onlyDigits } from '../../utils/formatters';
import { useAuth } from './useAuth';

interface AuthScreenProps {
    loginUser: string;
    setLoginUser: (v: string) => void;
    loginPassword: string;
    setLoginPassword: (v: string) => void;
    submitLogin: () => void;
    isLoading: boolean;
    savedProfiles: {id: string, name: string, email: string}[];
    handleSelectSavedProfile: (p: any) => void;
    handleRemoveSavedProfile: (id: string) => void;
    showToast: (msg: string, type?: 'error' | 'success' | 'info' | 'warning') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
    loginUser, setLoginUser, loginPassword, setLoginPassword, submitLogin, isLoading,
    savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile, showToast
}) => {
    const { submitRegister } = useAuth();
    
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isTeamMode, setIsTeamMode] = useState(false);
    const [teamMemberData, setTeamMemberData] = useState<any | null>(null);
    const [teamCpf, setTeamCpf] = useState('');
    const [isProcessingTeam, setIsProcessingTeam] = useState(false);

    const [newProfileForm, setNewProfileForm] = useState({ name: '', email: '', businessName: '', password: '', recoveryPhrase: '' });
    const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('team_ref');
        if (ref) {
            setIsTeamMode(true);
            checkTeamRef(ref);
        }
    }, []);

    const checkTeamRef = async (id: string) => {
        setIsProcessingTeam(true);
        try {
            const { data } = await supabase.from('team_members').select('*, teams(name)').eq('id', id).single();
            if (data) setTeamMemberData(data);
            else setIsTeamMode(false);
        } catch { setIsTeamMode(false); } finally { setIsProcessingTeam(false); }
    };

    const handleTeamAccess = async () => {
        const cleanCpf = onlyDigits(teamCpf);
        if (cleanCpf !== teamMemberData?.cpf) {
            showToast("CPF não autorizado.", "error");
            return;
        }
        setIsProcessingTeam(true);
        try {
            const { data: profile } = await supabase.from('perfis').select('*').eq('id', teamMemberData.linked_profile_id).single();
            if (!profile) throw new Error("Perfil não localizado.");
            localStorage.setItem('cm_session', JSON.stringify({ profileId: profile.id, ts: Date.now() }));
            window.location.reload();
        } catch (e: any) { showToast(e.message, "error"); } finally { setIsProcessingTeam(false); }
    };

    if (isTeamMode && teamMemberData) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
                <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="relative z-10 text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4"><ShieldCheck className="text-white w-8 h-8" /></div>
                        <h1 className="text-xl font-black text-white uppercase mb-1">Acesso Colaborador</h1>
                        <p className="text-slate-500 text-[10px] font-black uppercase">Equipe: {teamMemberData.teams?.name}</p>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                            <p className="text-base font-black text-white uppercase">{teamMemberData.full_name}</p>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
                                <div className="p-3 bg-slate-800 rounded-xl"><UserCheck className="text-slate-400 w-5 h-5" /></div>
                                <input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="Confirme seu CPF" value={teamCpf} onChange={e => setTeamCpf(maskDocument(e.target.value))} />
                            </div>
                            <button onClick={handleTeamAccess} disabled={isProcessingTeam} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase shadow-lg flex items-center justify-center gap-2">
                                {isProcessingTeam ? <Loader2 className="animate-spin" /> : <>Acessar Painel <ArrowRight size={16}/></>}
                            </button>
                        </div>
                        <button onClick={() => setIsTeamMode(false)} className="w-full text-[9px] text-slate-600 font-black uppercase">Entrar como Gestor</button>
                    </div>
                </div>
            </div>
        );
    }

    if (isCreatingProfile) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4"><UserPlus className="text-white" /></div>
                        <h2 className="text-xl font-black text-white uppercase">Nova Conta Master</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
                            <div className="p-3 bg-slate-800 rounded-xl"><User className="text-slate-400 w-4 h-4" /></div>
                            <input type="text" placeholder="Nome do Operador" className="bg-transparent w-full text-white outline-none text-sm font-bold" value={newProfileForm.name} onChange={e => setNewProfileForm({...newProfileForm, name: e.target.value})} />
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
                            <div className="p-3 bg-slate-800 rounded-xl"><Mail className="text-slate-400 w-4 h-4" /></div>
                            <input type="email" placeholder="Seu melhor E-mail" className="bg-transparent w-full text-white outline-none text-sm font-bold" value={newProfileForm.email} onChange={e => setNewProfileForm({...newProfileForm, email: e.target.value})} />
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
                            <div className="p-3 bg-slate-800 rounded-xl"><Building className="text-slate-400 w-4 h-4" /></div>
                            <input type="text" placeholder="Nome da sua Financeira" className="bg-transparent w-full text-white outline-none text-sm font-bold" value={newProfileForm.businessName} onChange={e => setNewProfileForm({...newProfileForm, businessName: e.target.value})} />
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
                            <div className="p-3 bg-slate-800 rounded-xl"><Lock className="text-slate-400 w-4 h-4" /></div>
                            <input type="password" placeholder="Crie sua Senha" className="bg-transparent w-full text-white outline-none text-sm font-bold" value={newProfileForm.password} onChange={e => setNewProfileForm({...newProfileForm, password: e.target.value})} />
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
                            <div className="p-3 bg-slate-800 rounded-xl"><MessageSquare className="text-slate-400 w-4 h-4" /></div>
                            <input type="text" placeholder="Frase de Recuperação" className="bg-transparent w-full text-white outline-none text-sm font-bold" value={newProfileForm.recoveryPhrase} onChange={e => setNewProfileForm({...newProfileForm, recoveryPhrase: e.target.value})} />
                        </div>
                        <button onClick={() => submitRegister(newProfileForm, (v) => {}, showToast)} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg">Criar Minha Conta</button>
                        <button onClick={() => setIsCreatingProfile(false)} className="w-full text-[10px] text-slate-500 font-bold uppercase">Já tenho conta</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-6 relative">
            <div className="absolute top-6 right-6 z-50">
                <button onClick={() => setShowHelpModal(true)} className="p-3 bg-slate-800/50 rounded-full text-slate-400 hover:text-white transition-all"><HelpCircle size={24}/></button>
            </div>
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center animate-in zoom-in-95 duration-300">
                <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full pointer-events-none"></div>
                <div className="relative z-10 text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-4"><TrendingUp className="text-white w-8 h-8" /></div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Capital<span className="text-blue-500">Flow</span></h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sincronizado na Nuvem</p>
                </div>
                <div className="space-y-6">
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2 focus-within:border-blue-500 transition-colors">
                            <div className="p-3 bg-slate-800 rounded-xl"><User className="text-slate-400 w-5 h-5" /></div>
                            <input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold placeholder:font-normal" placeholder="E-mail ou Usuário" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2 relative focus-within:border-blue-500 transition-colors">
                            <div className="p-3 bg-slate-800 rounded-xl"><KeyRound className="text-slate-400 w-5 h-5" /></div>
                            <input type={showPassword ? "text" : "password"} className="bg-transparent w-full text-white outline-none text-sm font-bold placeholder:font-normal pr-10" placeholder="Senha" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitLogin()} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <button onClick={submitLogin} disabled={isLoading} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">{isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}</button>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-800">
                        <button onClick={() => setIsCreatingProfile(true)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase hover:text-white transition-colors">Criar Nova Conta</button>
                        <button onClick={() => setIsRecoveringPassword(true)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase hover:text-white transition-colors">Recuperar Senha</button>
                    </div>
                    {savedProfiles.length > 0 && (
                        <div className="pt-2">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 text-center">Salvos</p>
                            <div className="flex flex-col gap-2">
                                {savedProfiles.map(p => (
                                    <div key={p.id} className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-600 transition-colors group" onClick={() => handleSelectSavedProfile(p)}>
                                        <div className="w-8 h-8 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">{p.name.charAt(0).toUpperCase()}</div>
                                        <div className="flex-1 overflow-hidden"><p className="text-xs font-bold text-white truncate">{p.name}</p><p className="text-[10px] text-slate-500 truncate">{p.email}</p></div>
                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveSavedProfile(p.id); }} className="p-2 text-slate-600 hover:text-rose-500"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {showHelpModal && (
                <Modal onClose={() => setShowHelpModal(false)} title="Central de Ajuda">
                    <div className="space-y-4">
                        <p className="text-center text-slate-400 text-sm mb-4">Selecione o motivo do contato. O suporte é realizado exclusivamente por mensagem.</p>
                        <button onClick={() => window.open(`https://wa.me/5592991148103?text=Esqueci minha senha`, '_blank')} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all group"><div className="flex items-center gap-3"><div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700"><KeyRound className="text-blue-500" size={20}/></div><span className="text-sm font-bold text-white">Esqueci a Senha</span></div><ChevronRight size={16} className="text-slate-500"/></button>
                        <button onClick={() => window.open(`https://wa.me/5592991148103?text=Esqueci meu usuário`, '_blank')} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all group"><div className="flex items-center gap-3"><div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700"><User className="text-emerald-500" size={20}/></div><span className="text-sm font-bold text-white">Esqueci o Usuário</span></div><ChevronRight size={16} className="text-slate-500"/></button>
                    </div>
                </Modal>
            )}
        </div>
    );
};
