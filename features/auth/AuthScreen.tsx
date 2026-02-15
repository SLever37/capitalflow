import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle, TrendingUp, User, KeyRound, Loader2, X, ChevronRight, Beaker, Eye, EyeOff, UserPlus, Phone, ShieldCheck, Mail, Lock } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { generateUUID } from '../../utils/generators';
import { maskPhone, maskDocument, onlyDigits } from '../../utils/formatters';
import { isValidCPForCNPJ } from '../../utils/validators';
import { useAuth } from './useAuth';

/**
 * LEAME: Refatoração de AuthScreen
 * 
 * Camadas Internas:
 * 1. Queries: Funções de persistência no Supabase.
 * 2. Hooks: Gerenciamento de lógica, formulários e efeitos.
 * 3. Views: Componentes de interface que preservam o JSX original.
 */

/* -------------------------------------------------------------------------- */
/* 1. CAMADA DE DADOS (QUERIES)                                               */
/* -------------------------------------------------------------------------- */

const fetchInviteByToken = async (token: string) => {
  return await supabase
    .from('team_members')
    .select('*, teams:team_id(owner_profile_id, name)')
    .eq('invite_token', token)
    .single();
};

const finalizeInvite = async (id: string, status: 'ACCEPTED' | 'EXPIRED') => {
  return await supabase
    .from('team_members')
    .update({ invite_status: status })
    .eq('id', id);
};

/* -------------------------------------------------------------------------- */
/* 2. CAMADA DE LÓGICA (HOOKS INTERNOS)                                       */
/* -------------------------------------------------------------------------- */

const useInviteFlow = (showToast: any) => {
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [inviteData, setInviteData] = useState<any | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const checkInviteToken = useCallback(async (token: string) => {
        setIsProcessing(true);
        try {
            const { data, error } = await fetchInviteByToken(token);
            if (error || !data) {
                showToast("Este link de convite é inválido ou não foi encontrado.", "error");
                setInviteToken(null);
                return;
            }
            const isPending = data.invite_status === 'PENDING';
            const isExpired = data.expires_at && new Date(data.expires_at) < new Date();

            if (!isPending) {
                showToast("Este convite já foi utilizado ou está inativo.", "warning");
                setInviteToken(null);
            } else if (isExpired) {
                showToast("Este convite expirou. Solicite um novo link ao seu gestor.", "error");
                await finalizeInvite(data.id, 'EXPIRED');
                setInviteToken(null);
            } else {
                setInviteData(data);
                showToast(`Convite validado para a equipe: ${data.teams?.name}`, "success");
            }
        } catch (e) {
            setInviteToken(null);
        } finally {
            setIsProcessing(false);
        }
    }, [showToast]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('invite_token');
        if (token) {
            setInviteToken(token);
            checkInviteToken(token);
        }
    }, [checkInviteToken]);

    return { inviteToken, setInviteToken, inviteData, isProcessing, setIsProcessing };
};

const useMemberActivation = (inviteData: any, submitTeamLogin: any, showToast: any, setIsProcessing: any) => {
    const [form, setForm] = useState({ name: '', document: '', phone: '', email: '', accessCode: '' });

    const handleActivate = async () => {
        if (!inviteData) return;
        if (!form.name.trim()) { showToast("Informe seu nome completo.", "error"); return; }
        if (!form.email.trim() || !form.email.includes('@')) { showToast("E-mail inválido.", "error"); return; }
        if (!form.document || !isValidCPForCNPJ(form.document)) { showToast("CPF inválido.", "error"); return; }
        if (!form.phone || form.phone.length < 14) { showToast("Telefone inválido.", "error"); return; }
        if (!form.accessCode || form.accessCode.length < 4) { showToast("Crie um código de acesso com 4 dígitos.", "error"); return; }

        setIsProcessing(true);
        try {
            const newProfileId = generateUUID();
            const cleanDoc = onlyDigits(form.document);
            const cleanPhone = onlyDigits(form.phone);
            
            const { error: profileError } = await supabase.from('perfis').insert({
                id: newProfileId,
                supervisor_id: inviteData.teams?.owner_profile_id, 
                nome_operador: form.name.trim().split(' ')[0],
                nome_completo: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                usuario_email: form.email.trim().toLowerCase(),
                senha_acesso: 'NO_PASSWORD',
                access_code: form.accessCode.trim(),
                document: cleanDoc,
                phone: cleanPhone,
                access_level: 2, 
                interest_balance: 0,
                total_available_capital: 0,
                created_at: new Date().toISOString()
            });

            if (profileError) throw profileError;

            const { error: memberError } = await supabase
                .from('team_members')
                .update({
                    profile_id: newProfileId,
                    linked_profile_id: newProfileId,
                    invite_status: 'ACCEPTED',
                    full_name: form.name.trim(),
                    username_or_email: form.email.trim().toLowerCase()
                })
                .eq('id', inviteData.id);

            if (memberError) throw memberError;

            showToast("Conta ativada com sucesso!", "success");
            await submitTeamLogin({ document: cleanDoc, phone: cleanPhone, code: form.accessCode }, (l: boolean) => setIsProcessing(l), showToast);
            window.history.replaceState({}, window.document.title, window.location.pathname);
        } catch (e: any) {
            showToast(e.message || "Erro na ativação", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return { form, setForm, handleActivate };
};

const useCreateProfile = (setLoginUser: any, setIsCreatingProfile: any, showToast: any, setIsProcessing: any) => {
    const [form, setForm] = useState({ name: '', email: '', businessName: '', password: '', recoveryPhrase: '' });

    const handleCreate = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.businessName.trim() || !form.password) {
            showToast("Preencha todos os campos obrigatórios.", "error");
            return;
        }
        if (form.password.length < 4) {
            showToast("A senha deve ter no mínimo 4 caracteres.", "error");
            return;
        }
        
        setIsProcessing(true);
        try {
            const newId = generateUUID();
            const { error } = await supabase.from('perfis').insert([{
                id: newId,
                nome_operador: form.name,
                usuario_email: form.email.trim().toLowerCase(),
                email: form.email.trim().toLowerCase(),
                nome_empresa: form.businessName,
                senha_acesso: form.password.trim(),
                recovery_phrase: form.recoveryPhrase,
                access_level: 2, 
                total_available_capital: 0,
                interest_balance: 0,
                created_at: new Date().toISOString()
            }]);
            if (error) throw error;
            showToast("Conta criada com sucesso! Faça login.", "success");
            setIsCreatingProfile(false);
            setLoginUser(form.email);
        } catch (e: any) {
            showToast("Erro ao criar conta: " + e.message, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return { form, setForm, handleCreate };
};

const useRecoveryAndSupport = (setIsRecoveringPassword: any, showToast: any) => {
    const [form, setForm] = useState({ email: '', phrase: '', newPassword: '' });

    const handleHelpSupport = (type: 'password' | 'user') => {
        const number = "5592991148103";
        let msg = type === 'password' ? "Olá, esqueci minha senha no CapitalFlow. Poderia me ajudar?" : "Olá, esqueci meu usuário de login no CapitalFlow. Poderia me ajudar?";
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleRecovery = async () => {
        if (!form.email.trim()) { showToast("Informe o e-mail cadastrado.", "error"); return; }
        showToast("Recuperação automática indisponível. Contate o suporte via WhatsApp.", "info");
        handleHelpSupport('password');
        setIsRecoveringPassword(false);
    };

    return { form, setForm, handleRecovery, handleHelpSupport };
};

/* -------------------------------------------------------------------------- */
/* 3. CAMADA DE APRESENTAÇÃO (VIEWS)                                          */
/* -------------------------------------------------------------------------- */

const InviteActivationView = ({ inviteData, form, setForm, onConfirm, isLoading }: any) => (
    <div className="space-y-4">
        <div className="relative z-10 text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-4"><UserPlus className="text-white w-8 h-8" /></div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter mb-1">Bem-vindo à Equipe</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Complete seu cadastro para acessar</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-black">Você está entrando em:</p>
            <p className="text-lg font-black text-white uppercase">{inviteData.teams?.name || 'Equipe'}</p>
        </div>
        <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Seu Nome Completo</label>
            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                <User className="text-slate-400 w-4 h-4 ml-2" />
                <input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="Nome Sobrenome" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
        </div>
        <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">E-mail (Opcional)</label>
            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                <Mail className="text-slate-400 w-4 h-4 ml-2" />
                <input type="email" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="seu@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
        </div>
        <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">CPF (Login)</label>
            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                <ShieldCheck className="text-slate-400 w-4 h-4 ml-2" />
                <input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="000.000.000-00" value={form.document} onChange={e => setForm({...form, document: maskDocument(e.target.value)})} />
            </div>
        </div>
        <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">WhatsApp (Login)</label>
            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                <Phone className="text-slate-400 w-4 h-4 ml-2" />
                <input type="tel" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} />
            </div>
        </div>
        <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Crie seu Código de Acesso (4 Dígitos)</label>
            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                <Lock className="text-slate-400 w-4 h-4 ml-2" />
                <input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="Ex: 1234" maxLength={6} value={form.accessCode} onChange={e => setForm({...form, accessCode: onlyDigits(e.target.value)})} />
            </div>
            <p className="text-[9px] text-slate-500 ml-1 mt-1">Este código substitui a senha para login rápido.</p>
        </div>
        <button onClick={onConfirm} disabled={isLoading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase shadow-lg transition-all mt-4 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="animate-spin" /> : 'Confirmar e Entrar'}
        </button>
    </div>
);

const LoginView = ({ loginUser, setLoginUser, loginPassword, setLoginPassword, showPassword, setShowPassword, submitLogin, isLoading, savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile, setIsCreatingProfile, setIsRecoveringPassword, handleDemoMode }: any) => (
    <div className="space-y-6">
        <div className="space-y-4 animate-in fade-in">
            <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2 focus-within:border-blue-500 transition-colors">
                <div className="p-3 bg-slate-800 rounded-xl"><User className="text-slate-400 w-5 h-5" /></div>
                <input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold placeholder:font-normal" placeholder="E-mail ou Usuário" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
            </div>
            <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2 relative focus-within:border-blue-500 transition-colors">
                <div className="p-3 bg-slate-800 rounded-xl"><KeyRound className="text-slate-400 w-5 h-5" /></div>
                <input 
                    type={showPassword ? "text" : "password"} 
                    className="bg-transparent w-full text-white outline-none text-sm font-bold placeholder:font-normal pr-10" 
                    placeholder="Senha" 
                    value={loginPassword} 
                    onChange={e => setLoginPassword(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && submitLogin()} 
                />
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
                    {savedProfiles.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-600 transition-colors group" onClick={() => handleSelectSavedProfile(p)}>
                            <div className="w-8 h-8 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">{p.name.charAt(0).toUpperCase()}</div>
                            <div className="flex-1 overflow-hidden"><p className="text-xs font-bold text-white truncate">{p.name}</p><p className="text-[10px] text-slate-500 truncate">{p.email}</p></div>
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveSavedProfile(p.id); }} className="p-2 text-slate-600 hover:text-rose-500"><X size={14} /></button>
                        </div>
                    ))}
                </div>
            </div>
        )}
        <button onClick={handleDemoMode} className="w-full py-3 border border-dashed border-emerald-600/50 text-emerald-500 hover:bg-emerald-600/10 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all"><Beaker size={14} /> Modo Demonstração</button>
    </div>
);

const CreateProfileView = ({ form, setForm, onConfirm, onCancel, isLoading }: any) => (
    <div className="space-y-4 animate-in slide-in-from-right duration-300">
        <h3 className="text-center text-white font-bold text-sm uppercase mb-2">Novo Cadastro (Gestor)</h3>
        <input type="text" placeholder="Nome do Usuário" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <input type="email" placeholder="E-mail para Login" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        <input type="text" placeholder="Nome do Negócio" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} />
        <input type="password" placeholder="Senha (Mín. 4 dígitos)" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        <input type="text" placeholder="Frase de Recuperação" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={form.recoveryPhrase} onChange={e => setForm({...form, recoveryPhrase: e.target.value})} />
        <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl text-xs font-black uppercase">Cancelar</button>
            <button onClick={onConfirm} disabled={isLoading} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg flex items-center justify-center gap-2 transition-all">
                {isLoading ? <Loader2 className="animate-spin" size={16}/> : 'Criar Perfil'}
            </button>
        </div>
    </div>
);

const RecoverPasswordView = ({ form, setForm, onConfirm, onCancel, onSupport }: any) => (
    <div className="space-y-4 animate-in slide-in-from-right duration-300">
        <h3 className="text-center text-white font-bold text-sm uppercase mb-2">Recuperar Acesso</h3>
        <input type="email" placeholder="E-mail Cadastrado" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm outline-none" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl text-xs font-black uppercase">Voltar</button>
            <button onClick={onConfirm} className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg transition-all">Contatar Suporte</button>
        </div>
    </div>
);

/* -------------------------------------------------------------------------- */
/* 4. COMPONENTE PRINCIPAL (AUTHSCREEN)                                       */
/* -------------------------------------------------------------------------- */

interface AuthScreenProps {
  loginUser: string;
  setLoginUser: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  submitLogin: () => void;
  isLoading: boolean;
  savedProfiles: any[];
  handleSelectSavedProfile: (p: any) => void;
  handleRemoveSavedProfile: (id: string) => void;
  showToast: (msg: string, type?: any) => void;
  toast?: any;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
    loginUser, setLoginUser, loginPassword, setLoginPassword, submitLogin, isLoading,
    savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile, showToast
}) => {
    const { submitTeamLogin } = useAuth();
    
    // Flags de UI
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Hooks de Lógica
    const { inviteToken, setInviteToken, inviteData, isProcessing: isProcessingInvite, setIsProcessing: setIsProcessingInvite } = useInviteFlow(showToast);
    const { form: memberForm, setForm: setMemberForm, handleActivate: handleActivateMember } = useMemberActivation(inviteData, submitTeamLogin, showToast, setIsProcessingInvite);
    const { form: createForm, setForm: setCreateForm, handleCreate: handleCreateProfile } = useCreateProfile(setLoginUser, setIsCreatingProfile, showToast, setIsProcessingInvite);
    const { form: recoverForm, setForm: setRecoverForm, handleRecovery: handlePasswordRecovery, handleHelpSupport } = useRecoveryAndSupport(setIsRecoveringPassword, showToast);

    const handleDemoMode = () => {
        localStorage.setItem('cm_session', JSON.stringify({ profileId: 'DEMO', timestamp: Date.now() }));
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-6 relative">
            <div className="absolute top-6 right-6 z-50">
                <button onClick={() => setShowHelpModal(true)} className="p-3 bg-slate-800/50 rounded-full text-slate-400 hover:text-white transition-all"><HelpCircle size={24}/></button>
            </div>

            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center animate-in zoom-in-95 duration-300">
                <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full pointer-events-none"></div>
                
                {inviteToken && inviteData ? (
                    <InviteActivationView 
                        inviteData={inviteData} 
                        form={memberForm} 
                        setForm={setMemberForm} 
                        onConfirm={handleActivateMember} 
                        isLoading={isProcessingInvite} 
                    />
                ) : (
                    <>
                        <div className="relative z-10 text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-4"><TrendingUp className="text-white w-8 h-8" /></div>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Capital<span className="text-blue-500">Flow</span></h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sincronizado na Nuvem</p>
                        </div>

                        {!isCreatingProfile && !isRecoveringPassword && (
                            <LoginView 
                                loginUser={loginUser} setLoginUser={setLoginUser} 
                                loginPassword={loginPassword} setLoginPassword={setLoginPassword}
                                showPassword={showPassword} setShowPassword={setShowPassword}
                                submitLogin={submitLogin} isLoading={isLoading}
                                savedProfiles={savedProfiles} handleSelectSavedProfile={handleSelectSavedProfile}
                                handleRemoveSavedProfile={handleRemoveSavedProfile}
                                setIsCreatingProfile={setIsCreatingProfile} setIsRecoveringPassword={setIsRecoveringPassword}
                                handleDemoMode={handleDemoMode}
                            />
                        )}

                        {isCreatingProfile && (
                            <CreateProfileView 
                                form={createForm} 
                                setForm={setCreateForm} 
                                onConfirm={handleCreateProfile} 
                                onCancel={() => setIsCreatingProfile(false)} 
                                isLoading={isProcessingInvite} 
                            />
                        )}

                        {isRecoveringPassword && (
                            <RecoverPasswordView 
                                form={recoverForm} 
                                setForm={setRecoverForm} 
                                onConfirm={handlePasswordRecovery} 
                                onCancel={() => setIsRecoveringPassword(false)} 
                            />
                        )}
                    </>
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