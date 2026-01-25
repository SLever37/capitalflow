
import React, { useState } from 'react';
import { HelpCircle, TrendingUp, User, KeyRound, Loader2, X, ChevronRight, Beaker } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';

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
    showToast: (msg: string, type?: 'error' | 'success') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
    loginUser, setLoginUser, loginPassword, setLoginPassword, submitLogin, isLoading,
    savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile, showToast
}) => {
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [newProfileForm, setNewProfileForm] = useState({ name: '', email: '', businessName: '', password: '', recoveryPhrase: '' });
    const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
    const [recoveryForm, setRecoveryForm] = useState({ email: '', phrase: '', newPassword: '' });
    const [showHelpModal, setShowHelpModal] = useState(false);

    const handleCreateProfile = async () => {
        // Validações de entrada
        if (!newProfileForm.name.trim()) {
            showToast("Por favor, preencha o Nome do Usuário.", "error");
            return;
        }
        if (!newProfileForm.email.trim()) {
            showToast("O campo E-mail é obrigatório.", "error");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newProfileForm.email)) {
            showToast("Insira um endereço de e-mail válido.", "error");
            return;
        }
        if (!newProfileForm.businessName.trim()) {
            showToast("O Nome do Negócio é necessário.", "error");
            return;
        }
        if (!newProfileForm.password) {
            showToast("Crie uma senha de acesso.", "error");
            return;
        }
        if (newProfileForm.password.length < 6) {
            showToast("A senha deve ter no mínimo 6 caracteres.", "error");
            return;
        }
        if (!newProfileForm.recoveryPhrase.trim()) {
            showToast("Defina uma Frase de Recuperação para segurança.", "error");
            return;
        }
        
        const { error } = await supabase.from('perfis').insert([{ 
            nome_operador: newProfileForm.name, 
            usuario_email: newProfileForm.email, 
            nome_empresa: newProfileForm.businessName, 
            senha_acesso: newProfileForm.password, 
            recovery_phrase: newProfileForm.recoveryPhrase, 
            access_level: 2
        }]);
    
        if (error) { 
            window.alert('Erro no Banco: ' + error.message);
        } else { 
            showToast("Conta criada com sucesso! Faça login agora.", "success"); 
            setIsCreatingProfile(false); 
        }
    };
    
    const handlePasswordRecovery = async () => {
        if (!recoveryForm.email.trim()) {
            showToast("Informe o e-mail cadastrado.", "error");
            return;
        }
        if (!recoveryForm.phrase.trim()) {
            showToast("Informe sua frase secreta de recuperação.", "error");
            return;
        }
        if (!recoveryForm.newPassword || recoveryForm.newPassword.length < 6) {
            showToast("A nova senha deve ter pelo menos 6 caracteres.", "error");
            return;
        }

        const { data: profiles } = await supabase.from('perfis').select('*').eq('usuario_email', recoveryForm.email);
        const profile = profiles?.find(p => p.recovery_phrase === recoveryForm.phrase);
        if (profile) { 
            await supabase.from('perfis').update({ senha_acesso: recoveryForm.newPassword }).eq('id', profile.id); 
            showToast("Senha redefinida com sucesso!", "success"); 
            setIsRecoveringPassword(false); 
        } else { 
            showToast("E-mail ou frase de recuperação incorretos.", "error"); 
        }
    };
    
    const handleHelpSupport = (type: 'password' | 'user') => {
        const number = "5592991148103";
        let msg = "";
        if(type === 'password') msg = "Olá, esqueci minha senha no CrediMaster. Poderia me ajudar?";
        if(type === 'user') msg = "Olá, esqueci meu usuário de login no CrediMaster. Poderia me ajudar?";
        
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleDemoMode = () => {
        // Usa um ID especial 'DEMO' que o useAppState irá interceptar
        localStorage.setItem('cm_session', JSON.stringify({ profileId: 'DEMO', timestamp: Date.now() }));
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-6 relative">
            <div className="absolute top-6 right-6 z-50">
                <button onClick={() => setShowHelpModal(true)} className="p-3 bg-slate-800/50 rounded-full text-slate-400 hover:text-white transition-all">
                    <HelpCircle size={24}/>
                </button>
            </div>
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center animate-in zoom-in-95 duration-300">
                <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full pointer-events-none"></div>
                <div className="relative z-10 text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-4"><TrendingUp className="text-white w-8 h-8" /></div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Capital<span className="text-blue-500">Flow</span></h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sincronizado na Nuvem</p>
                </div>
                {!isCreatingProfile && !isRecoveringPassword && (
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2"><div className="p-3 bg-slate-800 rounded-xl"><User className="text-slate-400 w-5 h-5" /></div><input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold placeholder:font-normal" placeholder="E-mail ou Usuário" value={loginUser} onChange={e => setLoginUser(e.target.value)} /></div>
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2"><div className="p-3 bg-slate-800 rounded-xl"><KeyRound className="text-slate-400 w-5 h-5" /></div><input type="password" id="login-password" className="bg-transparent w-full text-white outline-none text-sm font-bold placeholder:font-normal" placeholder="Senha" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitLogin()} /></div>
                        <button onClick={submitLogin} disabled={isLoading} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">{isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}</button>
                        
                        <div className="flex gap-2">
                             <button onClick={() => setIsCreatingProfile(true)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Criar Conta</button>
                             <button onClick={() => setIsRecoveringPassword(true)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Recuperar</button>
                        </div>

                         <button onClick={handleDemoMode} className="w-full py-3 border border-dashed border-emerald-600/50 text-emerald-500 hover:bg-emerald-600/10 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all">
                            <Beaker size={14} /> Modo Demonstração
                        </button>

                        {savedProfiles.length > 0 && (
                            <div className="pt-4 border-t border-slate-800/50">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 text-center">Contas Conhecidas</p>
                                <div className="flex flex-col gap-2">
                                    {savedProfiles.map(p => (
                                        <div key={p.id} className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-600 transition-colors" onClick={() => handleSelectSavedProfile(p)}>
                                            <div className="w-8 h-8 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400 font-black text-xs">{p.name.charAt(0).toUpperCase()}</div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-xs font-bold text-white truncate">{p.name}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{p.email}</p>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveSavedProfile(p.id); }} className="p-2 text-slate-600 hover:text-rose-500"><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {isCreatingProfile && (
                    <div className="space-y-4 animate-in slide-in-from-right duration-300">
                        <h3 className="text-center text-white font-bold text-sm uppercase mb-2">Novo Cadastro</h3>
                        <input type="text" placeholder="Nome do Usuário" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={newProfileForm.name} onChange={e => setNewProfileForm({...newProfileForm, name: e.target.value})} />
                        <input type="email" placeholder="E-mail para Login" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={newProfileForm.email} onChange={e => setNewProfileForm({...newProfileForm, email: e.target.value})} />
                        <input type="text" placeholder="Nome do Negócio" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={newProfileForm.businessName} onChange={e => setNewProfileForm({...newProfileForm, businessName: e.target.value})} />
                        <input type="password" placeholder="Senha" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={newProfileForm.password} onChange={e => setNewProfileForm({...newProfileForm, password: e.target.value})} />
                        <input type="text" placeholder="Frase de Recuperação" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={newProfileForm.recoveryPhrase} onChange={e => setNewProfileForm({...newProfileForm, recoveryPhrase: e.target.value})} />
                        <div className="flex gap-3 pt-2"><button onClick={() => setIsCreatingProfile(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl text-xs font-black uppercase">Cancelar</button><button onClick={handleCreateProfile} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg">Criar</button></div>
                    </div>
                )}
                {isRecoveringPassword && (
                    <div className="space-y-4 animate-in slide-in-from-right duration-300">
                        <h3 className="text-center text-white font-bold text-sm uppercase mb-2">Recuperar Acesso</h3>
                        <input type="email" placeholder="E-mail ou Usuário" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={recoveryForm.email} onChange={e => setRecoveryForm({...recoveryForm, email: e.target.value})} />
                        <input type="text" placeholder="Frase Secreta" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={recoveryForm.phrase} onChange={e => setRecoveryForm({...recoveryForm, phrase: e.target.value})} />
                        <input type="password" placeholder="Nova Senha" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={recoveryForm.newPassword} onChange={e => setRecoveryForm({...recoveryForm, newPassword: e.target.value})} />
                        <div className="flex gap-3 pt-2"><button onClick={() => setIsRecoveringPassword(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl text-xs font-black uppercase">Voltar</button><button onClick={handlePasswordRecovery} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg">Redefinir</button></div>
                    </div>
                )}
            </div>
            
            {showHelpModal && (
                <Modal onClose={() => setShowHelpModal(false)} title="Central de Ajuda">
                    <div className="space-y-4">
                        <p className="text-center text-slate-400 text-sm mb-4">Selecione o motivo do contato. O suporte é realizado exclusivamente por mensagem.</p>
                        <button onClick={() => handleHelpSupport('password')} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700"><KeyRound className="text-blue-500" size={20}/></div>
                                <span className="text-sm font-bold text-white">Esqueci a Senha</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-500"/>
                        </button>
                        <button onClick={() => handleHelpSupport('user')} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700"><User className="text-emerald-500" size={20}/></div>
                                <span className="text-sm font-bold text-white">Esqueci o Usuário</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-500"/>
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};
