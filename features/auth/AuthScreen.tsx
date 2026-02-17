import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle, TrendingUp, User, KeyRound, Loader2, X, ChevronRight, Beaker, Eye, EyeOff, UserPlus, Phone, ShieldCheck, Mail, Lock, AlertCircle, LogOut, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { generateUUID } from '../../utils/generators';
import { maskPhone, maskDocument, onlyDigits } from '../../utils/formatters';
import { isValidCPForCNPJ } from '../../utils/validators';
import { isDev } from '../../utils/isDev';

/**
 * 1. CAMADA DE DADOS (QUERIES)
 */
const fetchInviteByToken = async (token: string) => {
  return await supabase
    .from('team_members')
    .select('id, team_id, invite_status, invite_token, profile_id, linked_profile_id, full_name, username_or_email, expires_at, created_at')
    .eq('invite_token', token)
    .maybeSingle();
};

const finalizeInvite = async (id: string, status: 'ACCEPTED' | 'EXPIRED') => {
  return await supabase
    .from('team_members')
    .update({ invite_status: status })
    .eq('id', id);
};

/**
 * 2. CAMADA DE LÓGICA (HOOKS)
 */
const useInviteFlow = (showToast: any) => {
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [inviteData, setInviteData] = useState<any | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const checkInviteToken = useCallback(async (token: string) => {
        setIsProcessing(true);
        try {
            const { data, error } = await fetchInviteByToken(token);
            if (error || !data) {
                showToast("Convite inválido ou expirado.", "error");
                localStorage.removeItem('cm_invite_token');
                setInviteToken(null);
                return;
            }
            localStorage.setItem('cm_invite_token', token);
            setInviteData(data);
        } catch (e) {
            setInviteToken(null);
        } finally {
            setIsProcessing(false);
        }
    }, [showToast]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('invite_token') || localStorage.getItem('cm_invite_token');
        if (token) {
            setInviteToken(token);
            checkInviteToken(token);
        }
    }, [checkInviteToken]);

    const cancelInvite = () => {
        localStorage.removeItem('cm_invite_token');
        setInviteToken(null);
        setInviteData(null);
    };

    return { inviteToken, setInviteToken, inviteData, isProcessing, cancelInvite };
};

const useMemberActivation = (inviteData: any, submitTeamLogin: any, showToast: any, setIsProcessing: any) => {
    const [form, setForm] = useState({ name: '', document: '', phone: '', email: '', accessCode: '' });
    const [errorText, setErrorText] = useState('');

    const handleActivate = async () => {
        if (!inviteData) return;
        setErrorText('');
        
        if (!form.name.trim() || !form.email.trim() || !form.document || !form.accessCode) {
            setErrorText("Preencha todos os campos.");
            return;
        }

        setIsProcessing(true);
        try {
            const cleanDoc = onlyDigits(form.document);
            const cleanPhone = onlyDigits(form.phone);
            const email = form.email.trim().toLowerCase();
            const pass = form.accessCode.trim();
            let authUid = '';

            // 1. Sincronização com Supabase Auth (Essencial para RLS)
            // Tenta logar caso o usuário já tenha sido provisionado manualmente ou em tentativa anterior
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: pass
            });

            if (!signInError && signInData.user) {
                authUid = signInData.user.id;
            } else {
                // Se não conseguiu logar, tenta criar a conta no Auth
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password: pass,
                    options: { data: { full_name: form.name } }
                });

                if (signUpError) {
                    if (signUpError.message.includes('already registered')) {
                        throw new Error("Usuário já existe no sistema de autenticação. Use o mesmo código de acesso usado no cadastro ou contate o gestor.");
                    }
                    throw signUpError;
                }
                
                if (!signUpData.user) throw new Error("Falha ao criar credenciais de segurança.");
                authUid = signUpData.user.id;
            }

            // 2. Criar Perfil vinculado ao ID do Auth e preencher user_id para RLS
            const { error: profileError } = await supabase.from('perfis').insert({
                id: authUid,
                user_id: authUid, // Vincula o perfil ao usuário autenticado (v3.5+)
                supervisor_id: inviteData.teams?.owner_profile_id, 
                nome_operador: form.name.trim().split(' ')[0],
                nome_completo: form.name.trim(),
                email: email,
                usuario_email: email,
                senha_acesso: pass,
                access_code: pass,
                document: cleanDoc,
                phone: cleanPhone,
                access_level: 3, 
                created_at: new Date().toISOString()
            });

            if (profileError) throw profileError;

            await finalizeInvite(inviteData.id, 'ACCEPTED');
            localStorage.removeItem('cm_invite_token');
            showToast("Conta ativada!", "success");
            
            // Realiza login automático via fluxo de equipe
            await submitTeamLogin({ document: cleanDoc, phone: cleanPhone, code: pass }, showToast);
            
            // Limpa a URL e recarrega para aplicar sessão
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            window.location.reload();
        } catch (e: any) {
            setErrorText(e.message);
            setIsProcessing(false);
        }
    };

    return { form, setForm, handleActivate, errorText };
};

const useCreateProfile = (setLoginUser: any, setIsCreatingProfile: any, showToast: any, setIsProcessing: any) => {
    const [form, setForm] = useState({ name: '', email: '', businessName: '', password: '', recoveryPhrase: '' });

    const handleCreate = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.password) {
            showToast("Preencha os campos obrigatórios.", "error");
            return;
        }
        
        setIsProcessing(true);
        try {
            // 1. Criar no Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: form.email.trim().toLowerCase(),
                password: form.password.trim(),
                options: { data: { full_name: form.name } }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Erro ao gerar credenciais.");

            // 2. Criar Perfil com ID do Auth
            const { error } = await supabase.from('perfis').insert([{
                id: authData.user.id,
                user_id: authData.user.id,
                nome_operador: form.name,
                usuario_email: form.email.trim().toLowerCase(),
                email: form.email.trim().toLowerCase(),
                nome_empresa: form.businessName,
                senha_acesso: form.password.trim(),
                recovery_phrase: form.recoveryPhrase,
                access_level: 1, 
                created_at: new Date().toISOString()
            }]);

            if (error) throw error;
            showToast("Conta criada! Verifique seu e-mail.", "success");
            setIsCreatingProfile(false);
        } catch (e: any) {
            showToast(e.message, "error");
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
        let msg = type === 'password' ? "Olá, esqueci minha senha no CapitalFlow." : "Olá, esqueci meu usuário.";
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleRecovery = async () => {
        if (!form.email.trim()) return;
        const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim());
        if (error) showToast(error.message, "error");
        else showToast("E-mail de recuperação enviado!", "success");
        setIsRecoveringPassword(false);
    };

    return { form, setForm, handleRecovery, handleHelpSupport };
};

/**
 * 3. COMPONENTES DE INTERFACE (MANTIDOS)
 */
const InviteActivationView = ({ inviteData, form, setForm, onConfirm, isLoading, errorText, onCancel }: any) => (
    <div className="space-y-4 pb-24">
        <div className="relative z-10 text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-4"><UserPlus className="text-white w-8 h-8" /></div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter mb-1">Ativar Acesso</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Você está entrando em: Equipe</p>
        </div>
        
        {errorText && (
            <div className="bg-rose-900/20 border border-rose-500/30 p-4 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95">
                <AlertCircle className="text-rose-500 shrink-0" size={18}/>
                <p className="text-xs text-rose-200 font-bold leading-tight">{errorText}</p>
            </div>
        )}

        <div className="space-y-3">
            <input type="text" className="w-full bg-slate-800/50 p-4 rounded-xl text-white outline-none border border-slate-700 text-sm font-bold" placeholder="Nome Completo" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <input type="email" className="w-full bg-slate-800/50 p-4 rounded-xl text-white outline-none border border-slate-700 text-sm font-bold" placeholder="Seu E-mail" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input type="text" className="w-full bg-slate-800/50 p-4 rounded-xl text-white outline-none border border-slate-700 text-sm font-bold" placeholder="CPF" value={form.document} onChange={e => setForm({...form, document: maskDocument(e.target.value)})} />
            <input type="text" maxLength={4} className="w-full bg-slate-800/50 p-4 rounded-xl text-white outline-none border border-slate-700 text-sm font-bold" placeholder="Crie um PIN de 4 dígitos" value={form.accessCode} onChange={e => setForm({...form, accessCode: onlyDigits(e.target.value)})} />
        </div>

        <button onClick={onConfirm} disabled={isLoading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="animate-spin" /> : 'Ativar e Entrar'}
        </button>
        <button onClick={onCancel} className="w-full py-2 text-slate-500 text-[10px] font-black uppercase">Cancelar</button>
    </div>
);

const LoginView = ({ loginUser, setLoginUser, loginPassword, setLoginPassword, showPassword, setShowPassword, submitLogin, isLoading, savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile, setIsCreatingProfile, setIsRecoveringPassword, handleDemoMode }: any) => (
    <div className="space-y-6">
        <div className="space-y-4 animate-in fade-in">
            <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2 focus-within:border-blue-500 transition-colors">
                <div className="p-3 bg-slate-800 rounded-xl"><User className="text-slate-400 w-5 h-5" /></div>
                <input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="E-mail ou Usuário" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
            </div>
            <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 flex items-center gap-2 relative focus-within:border-blue-500 transition-colors">
                <div className="p-3 bg-slate-800 rounded-xl"><KeyRound className="text-slate-400 w-5 h-5" /></div>
                <input 
                    type={showPassword ? "text" : "password"} 
                    className="bg-transparent w-full text-white outline-none text-sm font-bold pr-10" 
                    placeholder="Senha" 
                    value={loginPassword} 
                    onChange={e => setLoginPassword(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && submitLogin()} 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-500">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            <button onClick={submitLogin} disabled={isLoading} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">{isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}</button>
        </div>
        <div className="flex gap-2 pt-2 border-t border-slate-800">
            <button onClick={() => setIsCreatingProfile(true)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Criar Conta</button>
            <button onClick={() => setIsRecoveringPassword(true)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Esqueci Senha</button>
        </div>
        {savedProfiles.length > 0 && (
            <div className="pt-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 text-center">Salvos</p>
                <div className="flex flex-col gap-2">
                    {savedProfiles.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-600 transition-colors group" onClick={() => handleSelectSavedProfile(p)}>
                            <div className="w-8 h-8 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400 font-black text-xs">{p.name.charAt(0).toUpperCase()}</div>
                            <div className="flex-1 overflow-hidden"><p className="text-xs font-bold text-white truncate">{p.name}</p></div>
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveSavedProfile(p.id); }} className="p-2 text-slate-600 hover:text-rose-500"><X size={14} /></button>
                        </div>
                    ))}
                </div>
            </div>
        )}
        <button onClick={handleDemoMode} className="w-full py-3 border border-dashed border-emerald-600/50 text-emerald-500 hover:bg-emerald-600/10 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all"><Beaker size={14} /> Modo Demonstração</button>
    </div>
);

/**
 * 4. COMPONENTE PRINCIPAL
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({
    loginUser, setLoginUser, loginPassword, setLoginPassword, submitLogin, submitTeamLogin, isLoading,
    savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile, showToast, toast
}) => {
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const { inviteToken, inviteData, isProcessing: isProcessingInvite, cancelInvite } = useInviteFlow(showToast);
    const { form: memberForm, setForm: setMemberForm, handleActivate: handleActivateMember, errorText } = useMemberActivation(inviteData, submitTeamLogin, showToast, (l: any) => {});
    const { form: createForm, setForm: setCreateForm, handleCreate: handleCreateProfile } = useCreateProfile(setLoginUser, setIsCreatingProfile, showToast, (l: any) => {});
    const { handleHelpSupport, handleRecovery } = useRecoveryAndSupport(setIsRecoveringPassword, showToast);

    const handleDemoMode = () => {
        localStorage.setItem('cm_session', JSON.stringify({ profileId: 'DEMO', ts: Date.now() }));
        window.location.reload();
    };

    return (
        <div className="min-h-[100dvh] bg-slate-950 flex items-start sm:items-center justify-center p-4 md:p-6 relative overflow-y-auto py-8">
            {toast && (
                <div className={`fixed z-[150] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 left-4 right-4 top-4 md:left-auto md:right-4 md:w-auto ${toast.type === 'error' ? 'bg-rose-600 text-white' : toast.type === 'warning' ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'}`}>
                    {toast.type === 'error' ? <AlertCircle size={24}/> : toast.type === 'warning' ? <AlertTriangle size={24}/> : <CheckCircle2 size={24}/>}
                    <span className="font-bold text-sm leading-tight">{toast.msg}</span>
                </div>
            )}

            <div className="absolute top-6 right-6 z-50">
                <button onClick={() => setShowHelpModal(true)} className="p-3 bg-slate-800/50 rounded-full text-slate-400 hover:text-white transition-all"><HelpCircle size={24}/></button>
            </div>

            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col justify-center animate-in zoom-in-95 duration-300">
                <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full pointer-events-none"></div>
                
                {inviteToken && inviteData ? (
                    <InviteActivationView 
                        inviteData={inviteData} 
                        form={memberForm} 
                        setForm={setMemberForm} 
                        onConfirm={handleActivateMember} 
                        isLoading={isProcessingInvite}
                        errorText={errorText}
                        onCancel={cancelInvite}
                    />
                ) : (
                    <>
                        <div className="relative z-10 text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-4"><TrendingUp className="text-white w-8 h-8" /></div>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Capital<span className="text-blue-500">Flow</span></h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Acesso Restrito</p>
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
                            <div className="animate-in slide-in-from-right duration-300 space-y-4">
                                <h3 className="text-center text-white font-black uppercase text-sm">Nova Conta</h3>
                                <input type="text" placeholder="Seu Nome" className="w-full bg-slate-800 p-4 rounded-xl text-white outline-none" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                                <input type="email" placeholder="E-mail" className="w-full bg-slate-800 p-4 rounded-xl text-white outline-none" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} />
                                <input type="password" placeholder="Senha" className="w-full bg-slate-800 p-4 rounded-xl text-white outline-none" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} />
                                <button onClick={handleCreateProfile} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs">Criar Perfil</button>
                                <button onClick={() => setIsCreatingProfile(false)} className="w-full text-slate-500 text-[10px] uppercase font-bold">Voltar</button>
                            </div>
                        )}

                        {isRecoveringPassword && (
                            <div className="animate-in slide-in-from-left duration-300 space-y-4">
                                <h3 className="text-center text-white font-black uppercase text-sm">Recuperar</h3>
                                <input type="email" placeholder="Seu e-mail cadastrado" className="w-full bg-slate-800 p-4 rounded-xl text-white outline-none" value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} />
                                <button onClick={handleRecovery} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs">Enviar E-mail</button>
                                <button onClick={() => setIsRecoveringPassword(false)} className="w-full text-slate-500 text-[10px] uppercase font-bold">Voltar</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showHelpModal && (
                <Modal onClose={() => setShowHelpModal(false)} title="Suporte">
                    <div className="space-y-4">
                        <button onClick={() => handleHelpSupport('password')} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all"><span className="text-sm font-bold text-white">Esqueci a Senha</span><ChevronRight size={16} className="text-slate-500"/></button>
                        <button onClick={() => handleHelpSupport('user')} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all"><span className="text-sm font-bold text-white">Não consigo entrar</span><ChevronRight size={16} className="text-slate-500"/></button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

interface AuthScreenProps {
  loginUser: string;
  setLoginUser: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  submitLogin: () => void;
  submitTeamLogin: (
    params: { document: string; phone: string; code: string },
    showToast: (msg: string, type?: any) => void
  ) => Promise<void>;
  isLoading: boolean;
  savedProfiles: any[];
  handleSelectSavedProfile: (p: any) => void;
  handleRemoveSavedProfile: (id: string) => void;
  showToast: (msg: string, type?: any) => void;
  toast?: any;
}