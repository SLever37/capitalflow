import React, { useState, useEffect } from 'react';
import { HelpCircle, TrendingUp, User, KeyRound, Loader2, X, ChevronRight, Beaker, Eye, EyeOff, UserPlus, Phone, ShieldCheck, Mail } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { generateUUID } from '../../utils/generators';
import { maskPhone, maskDocument, onlyDigits } from '../../utils/formatters';
import { isValidCPForCNPJ } from '../../utils/validators';

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
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Novo Estado para Ativação de Membro
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [memberActivationForm, setMemberActivationForm] = useState({
        name: '', // Pré-carregado
        document: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

    // Estados originais
    const [newProfileForm, setNewProfileForm] = useState({ name: '', email: '', businessName: '', password: '', recoveryPhrase: '' });
    const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
    const [recoveryForm, setRecoveryForm] = useState({ email: '', phrase: '', newPassword: '' });
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [isProcessingCreate, setIsProcessingCreate] = useState(false);

    // Efeito para detectar Token de Convite na URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('invite_token');
        if (token) {
            setInviteToken(token);
            checkInviteToken(token);
        }
    }, []);

    const checkInviteToken = async (token: string) => {
        setIsProcessingCreate(true);
        try {
            // Busca perfil que tenha este token na recovery_phrase (hack de armazenamento temporário)
            const { data, error } = await supabase
                .from('perfis')
                .select('*')
                .eq('recovery_phrase', `INVITE:${token}`)
                .single();

            if (error || !data) {
                showToast("Link de convite inválido ou expirado.", "error");
                setInviteToken(null);
            } else {
                setPendingProfileId(data.id);
                setMemberActivationForm(prev => ({ ...prev, name: data.nome_operador }));
            }
        } catch (e) {
            console.error(e);
            setInviteToken(null);
        } finally {
            setIsProcessingCreate(false);
        }
    };

    const handleActivateMember = async () => {
        if (!inviteToken || !pendingProfileId) return;

        const { document, phone, email, password, confirmPassword } = memberActivationForm;

        // Validações Rígidas
        if (!email.trim() || !email.includes('@')) { showToast("E-mail inválido.", "error"); return; }
        if (!document || !isValidCPForCNPJ(document)) { showToast("CPF inválido. Verifique os números.", "error"); return; }
        if (!phone || phone.length < 14) { showToast("Telefone inválido.", "error"); return; }
        if (password.length < 6) { showToast("A senha deve ter no mínimo 6 caracteres.", "error"); return; }
        if (password !== confirmPassword) { showToast("As senhas não coincidem.", "error"); return; }

        setIsProcessingCreate(true);
        try {
            // Atualiza o perfil placeholder com os dados reais do membro
            const { error } = await supabase
                .from('perfis')
                .update({
                    document: onlyDigits(document),
                    phone: onlyDigits(phone),
                    usuario_email: email.toLowerCase().trim(),
                    email: email.toLowerCase().trim(), // Atualiza email principal
                    senha_acesso: password,
                    recovery_phrase: `ACTIVE:${new Date().toISOString()}`, // Invalida o token anterior
                    last_active_at: new Date().toISOString()
                })
                .eq('id', pendingProfileId)
                .eq('recovery_phrase', `INVITE:${inviteToken}`); // Trava de segurança extra

            if (error) throw error;

            showToast("Conta ativada com sucesso! Fazendo login...", "success");
            
            // Auto-login
            setLoginUser(email);
            setLoginPassword(password);
            setTimeout(() => {
                submitLogin();
                // Limpa URL
                window.history.replaceState({}, window.document.title, window.location.pathname);
            }, 1000);

        } catch (e: any) {
            showToast("Erro na ativação: " + e.message, "error");
        } finally {
            setIsProcessingCreate(false);
        }
    };

    const handleCreateProfile = async () => {
        if (!newProfileForm.name.trim()) { showToast("Por favor, preencha o Nome do Usuário.", "error"); return; }
        if (!newProfileForm.email.trim()) { showToast("O campo E-mail é obrigatório.", "error"); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newProfileForm.email)) { showToast("Insira um endereço de e-mail válido.", "error"); return; }
        if (!newProfileForm.businessName.trim()) { showToast("O Nome do Negócio é necessário.", "error"); return; }
        if (!newProfileForm.password) { showToast("Crie uma senha de acesso.", "error"); return; }
        
        if (newProfileForm.password.length < 4) {
            showToast("A senha deve ter no mínimo 4 caracteres.", "error");
            return;
        }
        
        if (!newProfileForm.recoveryPhrase.trim()) { showToast("Defina uma Frase de Recuperação para segurança.", "error"); return; }
        
        setIsProcessingCreate(true);
        try {
            const newId = generateUUID();
            const { error } = await supabase.from('perfis').insert([{
                id: newId,
                nome_operador: newProfileForm.name,
                usuario_email: newProfileForm.email.trim().toLowerCase(),
                email: newProfileForm.email.trim().toLowerCase(),
                nome_empresa: newProfileForm.businessName,
                senha_acesso: newProfileForm.password.trim(),
                recovery_phrase: newProfileForm.recoveryPhrase,
                access_level: 2, // Default
                total_available_capital: 0,
                interest_balance: 0,
                created_at: new Date().toISOString()
            }]);
    
            if (error) { 
                showToast('Erro ao criar conta: ' + error.message, 'error');
            } else { 
                showToast("Conta criada com sucesso! Faça login.", "success");
                setIsCreatingProfile(false);
                setLoginUser(newProfileForm.email);
            }
        } catch (e: any) {
            showToast("Erro inesperado: " + e.message, "error");
        } finally {
            setIsProcessingCreate(false);
        }
    };
    
    const handlePasswordRecovery = async () => {
        if (!recoveryForm.email.trim()) { showToast("Informe o e-mail cadastrado.", "error"); return; }
        showToast("Recuperação automática indisponível. Contate o suporte via WhatsApp.", "info");
        handleHelpSupport('password');
        setIsRecoveringPassword(false);
    };
    
    const handleHelpSupport = (type: 'password' | 'user') => {
        const number = "5592991148103";
        let msg = type === 'password' ? "Olá, esqueci minha senha no CapitalFlow. Poderia me ajudar?" : "Olá, esqueci meu usuário de login no CapitalFlow. Poderia me ajudar?";
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleDemoMode = () => {
        localStorage.setItem('cm_session', JSON.stringify({ profileId: 'DEMO', timestamp: Date.now() }));
        window.location.reload();
    };

    // TELA DE ATIVAÇÃO DE MEMBRO (CONVITE)
    if (inviteToken && pendingProfileId) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-6 relative">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center animate-in zoom-in-95 duration-300">
                    <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full pointer-events-none"></div>
                    <div className="relative z-10 text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-4"><UserPlus className="text-white w-8 h-8" /></div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tighter mb-1">Bem-vindo à Equipe</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Complete seu cadastro para acessar</p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-black">Olá,</p>
                            <p className="text-lg font-black text-white uppercase">{memberActivationForm.name}</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Seu E-mail de Login</label>
                            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                                <Mail className="text-slate-400 w-4 h-4 ml-2" />
                                <input type="email" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="seu@email.com" value={memberActivationForm.email} onChange={e => setMemberActivationForm({...memberActivationForm, email: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">CPF (Apenas Números)</label>
                            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                                <ShieldCheck className="text-slate-400 w-4 h-4 ml-2" />
                                <input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="000.000.000-00" value={memberActivationForm.document} onChange={e => setMemberActivationForm({...memberActivationForm, document: maskDocument(e.target.value)})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">WhatsApp</label>
                            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                                <Phone className="text-slate-400 w-4 h-4 ml-2" />
                                <input type="tel" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="(00) 00000-0000" value={memberActivationForm.phone} onChange={e => setMemberActivationForm({...memberActivationForm, phone: maskPhone(e.target.value)})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Crie sua Senha</label>
                            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2 relative">
                                <KeyRound className="text-slate-400 w-4 h-4 ml-2" />
                                <input type={showPassword ? "text" : "password"} className="bg-transparent w-full text-white outline-none text-sm font-bold pr-8" placeholder="Mínimo 6 caracteres" value={memberActivationForm.password} onChange={e => setMemberActivationForm({...memberActivationForm, password: e.target.value})} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-slate-500 hover:text-white"><Eye size={14}/></button>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Confirme a Senha</label>
                            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                                <KeyRound className="text-slate-400 w-4 h-4 ml-2" />
                                <input type="password" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="Repita a senha" value={memberActivationForm.confirmPassword} onChange={e => setMemberActivationForm({...memberActivationForm, confirmPassword: e.target.value})} />
                            </div>
                        </div>

                        <button onClick={handleActivateMember} disabled={isProcessingCreate} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase shadow-lg transition-all mt-4 flex items-center justify-center gap-2">
                            {isProcessingCreate ? <Loader2 className="animate-spin" /> : 'Ativar Minha Conta'}
                        </button>
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
                {!isCreatingProfile && !isRecoveringPassword && (
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
                            <div className="p-3 bg-slate-800 rounded-xl">
                                <User className="text-slate-400 w-5 h-5" />
                            </div>
                            <input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold placeholder:font-normal" placeholder="E-mail ou Usuário" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
                        </div>
                        
                        <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2 relative">
                            <div className="p-3 bg-slate-800 rounded-xl">
                                <KeyRound className="text-slate-400 w-5 h-5" />
                            </div>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                id="login-password" 
                                className="bg-transparent w-full text-white outline-none text-sm font-bold placeholder:font-normal pr-10" 
                                placeholder="Senha" 
                                value={loginPassword} 
                                onChange={e => setLoginPassword(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && submitLogin()} 
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button onClick={submitLogin} disabled={isLoading} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">{isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}</button>
                        <div className="flex gap-2"><button onClick={() => setIsCreatingProfile(true)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Criar Conta</button><button onClick={() => setIsRecoveringPassword(true)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Recuperar</button></div>
                        <button onClick={handleDemoMode} className="w-full py-3 border border-dashed border-emerald-600/50 text-emerald-500 hover:bg-emerald-600/10 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all"><Beaker size={14} /> Modo Demonstração</button>
                        {savedProfiles.length > 0 && (
                            <div className="pt-4 border-t border-slate-800/50">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 text-center">Contas Conhecidas</p>
                                <div className="flex flex-col gap-2">
                                    {savedProfiles.map(p => (
                                        <div key={p.id} className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-600 transition-colors" onClick={() => handleSelectSavedProfile(p)}>
                                            <div className="w-8 h-8 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400 font-black text-xs">{p.name.charAt(0).toUpperCase()}</div>
                                            <div className="flex-1 overflow-hidden"><p className="text-xs font-bold text-white truncate">{p.name}</p><p className="text-[10px] text-slate-500 truncate">{p.email}</p></div>
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
                        <input type="password" placeholder="Senha (Mín. 4 dígitos)" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={newProfileForm.password} onChange={e => setNewProfileForm({...newProfileForm, password: e.target.value})} />
                        <input type="text" placeholder="Frase de Recuperação" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={newProfileForm.recoveryPhrase} onChange={e => setNewProfileForm({...newProfileForm, recoveryPhrase: e.target.value})} />
                        <div className="flex gap-3 pt-2"><button onClick={() => setIsCreatingProfile(false)} disabled={isProcessingCreate} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl text-xs font-black uppercase">Cancelar</button><button onClick={handleCreateProfile} disabled={isProcessingCreate} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg flex items-center justify-center gap-2">{isProcessingCreate ? <Loader2 className="animate-spin"/> : 'Criar'}</button></div>
                    </div>
                )}
                {isRecoveringPassword && (
                    <div className="space-y-4 animate-in slide-in-from-right duration-300">
                        <h3 className="text-center text-white font-bold text-sm uppercase mb-2">Recuperar Acesso</h3>
                        <input type="email" placeholder="E-mail Cadastrado" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={recoveryForm.email} onChange={e => setRecoveryForm({...recoveryForm, email: e.target.value})} />
                        <div className="flex gap-3 pt-2"><button onClick={() => setIsRecoveringPassword(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl text-xs font-black uppercase">Voltar</button><button onClick={handlePasswordRecovery} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg">Contatar Suporte</button></div>
                    </div>
                )}
            </div>
            {showHelpModal && (
                <Modal onClose={() => setShowHelpModal(false)} title="Central de Ajuda">
                    <div className="space-y-4">
                        <p className="text-center text-slate-400 text-sm mb-4">Selecione o motivo do contato. O suporte é realizado exclusivamente por mensagem.</p>
                        <button onClick={() => handleHelpSupport('password')} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all group"><div className="flex items-center gap-3"><div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700"><KeyRound className="text-blue-500" size={20}/></div><span className="text-sm font-bold text-white">Esqueci a Senha</span></div><ChevronRight size={16} className="text-slate-500"/></button>
                        <button onClick={() => handleHelpSupport('user')} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all group"><div className="flex items-center gap-3"><div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700"><User className="text-emerald-500" size={20}/></div><span className="text-sm font-bold text-white">Esqueci o Usuário</span></div><ChevronRight size={16} className="text-slate-500"/></button>
                    </div>
                </Modal>
            )}
        </div>
    );
};