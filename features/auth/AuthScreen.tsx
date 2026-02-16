import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle, TrendingUp, User, KeyRound, Loader2, X, ChevronRight, Beaker, Eye, EyeOff, UserPlus, Phone, ShieldCheck, Mail, Lock } from 'lucide-react';
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
  if (isDev) console.warn('[INVITE] Validando token:', token);
  return await supabase
    .from('team_members')
    .select('*, teams:team_id(owner_profile_id, name)')
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
            
            if (error) {
                if (isDev) console.error('[INVITE] Erro Supabase:', error);
                showToast("Erro ao validar convite. Tente novamente.", "error");
                return;
            }

            if (!data) {
                showToast("Este convite não foi encontrado ou já foi removido.", "error");
                localStorage.removeItem('cm_invite_token');
                setInviteToken(null);
                return;
            }

            const isPending = data.invite_status === 'PENDING';
            const isExpired = data.expires_at && new Date(data.expires_at).getTime() < Date.now();

            if (!isPending) {
                showToast("Este convite já foi utilizado ou está inativo.", "warning");
                localStorage.removeItem('cm_invite_token');
                setInviteToken(null);
            } else if (isExpired) {
                showToast("Este convite expirou. Solicite um novo link.", "error");
                await finalizeInvite(data.id, 'EXPIRED');
                localStorage.removeItem('cm_invite_token');
                setInviteToken(null);
            } else {
                // Sucesso: Persiste para sobreviver a navegação
                localStorage.setItem('cm_invite_token', token);
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
        const tokenFromUrl = params.get('invite_token');
        const tokenFromStorage = localStorage.getItem('cm_invite_token');
        
        const activeToken = tokenFromUrl || tokenFromStorage;

        if (activeToken) {
            setInviteToken(activeToken);
            checkInviteToken(activeToken);
            
            // Limpa URL para estética mas mantém o fluxo
            if (tokenFromUrl) {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            }
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

            const { error: memberError } = await finalizeInvite(inviteData.id, 'ACCEPTED');
            if (memberError) throw memberError;

            localStorage.removeItem('cm_invite_token');
            showToast("Conta ativada com sucesso!", "success");
            await submitTeamLogin({ document: cleanDoc, phone: cleanPhone, code: form.accessCode }, (l: boolean) => setIsProcessing(l), showToast);
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

/**
 * 3. COMPONENTES DE INTERFACE
 */
const InviteActivationView = ({ inviteData, form, setForm, onConfirm, isLoading }: any) => (
    <div className="space-y-4">
        <div className="relative z-10 text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-4"><UserPlus className="text-white w-8 h-8" /></div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter mb-1">Ativar Acesso</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Complete seu cadastro na equipe</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-black">Equipe:</p>
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
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">E-mail (Login)</label>
            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                <Mail className="text-slate-400 w-4 h-4 ml-2" />
                <input type="email" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="seu@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">CPF</label>
                <input type="text" className="bg-slate-800/50 w-full text-white outline-none p-3 rounded-xl border border-slate-700 text-xs font-bold" placeholder="000.000.000-00" value={form.document} onChange={e => setForm({...form, document: maskDocument(e.target.value)})} />
            </div>
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">WhatsApp</label>
                <input type="tel" className="bg-slate-800/50 w-full text-white outline-none p-3 rounded-xl border border-slate-700 text-xs font-bold" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} />
            </div>
        </div>
        <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Código de Acesso (4 Dígitos)</label>
            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex items-center gap-2">
                <Lock className="text-slate-400 w-4 h-4 ml-2" />
                <input type="text" className="bg-transparent w-full text-white outline-none text-sm font-bold" placeholder="Ex: 1234" maxLength={4} value={form.accessCode} onChange={e => setForm({...form, accessCode: onlyDigits(e.target.value)})} />
            </div>
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

/**
 * 4. COMPONENTE PRINCIPAL
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({
    loginUser, setLoginUser, loginPassword, setLoginPassword, submitLogin, submitTeamLogin, isLoading,
    savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile, showToast
}) => {
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const { inviteToken, inviteData, isProcessing: isProcessingInvite, setIsProcessing: setIsProcessingInvite } = useInviteFlow(showToast);
    const { form: memberForm, setForm: setMemberForm, handleActivate: handleActivateMember } = useMemberActivation(inviteData, submitTeamLogin, showToast, setIsProcessingInvite);
    const { form: createForm, setForm: setCreateForm, handleCreate: handleCreateProfile } = useCreateProfile(setLoginUser, setIsCreatingProfile, showToast, setIsProcessingInvite);
    const { handleHelpSupport } = useRecoveryAndSupport(setIsRecoveringPassword, showToast);

    const handleDemoMode = () => {
        localStorage.setItem('cm_session', JSON.stringify({ profileId: 'DEMO', ts: Date.now() }));
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
                            <div className="animate-in slide-in-from-right duration-300">
                                <h3 className="text-center text-white font-bold text-sm uppercase mb-4">Nova Conta</h3>
                                <div className="space-y-3">
                                    <input type="text" placeholder="Seu Nome" className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                                    <input type="email" placeholder="E-mail" className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} />
                                    <input type="password" placeholder="Senha" className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} />
                                    <button onClick={handleCreateProfile} disabled={isProcessingInvite} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs">Criar Perfil</button>
                                    <button onClick={() => setIsCreatingProfile(false)} className="w-full text-slate-500 text-[10px] uppercase font-bold">Voltar</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showHelpModal && (
                <Modal onClose={() => setShowHelpModal(false)} title="Suporte Técnico">
                    <div className="space-y-4">
                        <button onClick={() => handleHelpSupport('password')} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all group"><div className="flex items-center gap-3"><div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700"><KeyRound className="text-blue-500" size={20}/></div><span className="text-sm font-bold text-white">Esqueci a Senha</span></div><ChevronRight size={16} className="text-slate-500"/></button>
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
    setIsLoading: (v: boolean) => void,
    showToast: (msg: string, type?: any) => void
  ) => Promise<void>;
  isLoading: boolean;
  savedProfiles: any[];
  handleSelectSavedProfile: (p: any) => void;
  handleRemoveSavedProfile: (id: string) => void;
  showToast: (msg: string, type?: any) => void;
  toast?: any;
}
