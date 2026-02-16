import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { requestBrowserNotificationPermission } from '../../utils/notifications';
import { asString } from '../../utils/safe';
import { playNotificationSound } from '../../utils/notificationSound';
import { onlyDigits } from '../../utils/formatters';
import { isDev } from '../../utils/isDev';

type SavedProfile = {
  id: string;
  name: string;
  email: string;
};

const resolveSmartName = (p: any): string => {
  if (!p) return 'Gestor';
  const isGeneric = (s: string) => {
    if (!s) return true;
    const clean = s.toLowerCase().trim();
    return ['usuário', 'usuario', 'user', 'operador', 'admin', 'gestor', 'undefined', 'null', ''].includes(clean);
  };
  const display = asString(p.nome_exibicao);
  if (display && !isGeneric(display)) return display;
  const operator = asString(p.nome_operador);
  if (operator && !isGeneric(operator)) return operator;
  const business = asString(p.nome_empresa);
  if (business && !isGeneric(business)) return business;
  const full = asString(p.nome_completo);
  if (full && !isGeneric(full)) return full.split(' ')[0];
  const email = asString(p.usuario_email || p.email);
  if (email && email.includes('@')) {
    const prefix = email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return 'Gestor';
};

const mapLoginError = (err: any) => {
  const msg = String(err?.message || err || '');
  if (msg.toLowerCase().includes('invalid login')) return 'Usuário ou senha inválidos.';
  if (msg.toLowerCase().includes('perfil não encontrado')) return 'Perfil não encontrado. Verifique o usuário.';
  if (msg.toLowerCase().includes('senha incorreta')) return 'Usuário ou senha inválidos.';
  if (msg.toLowerCase().includes('credenciais inválidas')) return 'Usuário ou senha inválidos.';
  if (msg.toLowerCase().includes('expired')) return 'Sessão/convite expirado. Gere um novo link.';
  if (msg.toLowerCase().includes('permission')) return 'Sem permissão para acessar. Verifique RLS/políticas.';
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch'))
    return 'Falha de conexão. Verifique a internet.';
  return msg || 'Erro desconhecido no login.';
};

const devLog = (...args: any[]) => {
  if (isDev) {
    console.warn('[AUTH]', ...args);
  }
};

export const useAuth = () => {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [bootFinished, setBootFinished] = useState(false);

  const trackAccess = async (profileId: string) => {
    if (!profileId || profileId === 'DEMO') return;
    try {
      await supabase.rpc('increment_profile_access', { p_profile_id: profileId });
    } catch (e) {
      devLog("Falha ao registrar métrica de acesso", e);
    }
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        // Carrega perfis salvos
        const saved = localStorage.getItem('cm_saved_profiles');
        if (saved && mounted) {
          try { setSavedProfiles(JSON.parse(saved)); } catch {}
        }

        // Verifica Sessão Auth do Supabase (Obrigatório para RLS)
        const { data } = await supabase.auth.getSession();
        
        if (!mounted) return;

        // Se estiver na rota de convite, não bloqueia o boot para permitir a página carregar
        if (window.location.pathname.includes('setup-password')) {
          setBootFinished(true);
          return;
        }

        // Verifica Sessão CapitalFlow (LocalStorage)
        const session = localStorage.getItem('cm_session');
        if (session) {
          try {
            const parsed = JSON.parse(session);
            if (parsed?.profileId && mounted) {
                setActiveProfileId(parsed.profileId);
                trackAccess(parsed.profileId);
            }
          } catch {
            localStorage.removeItem('cm_session');
          }
        }
      } catch (err) {
        devLog('Boot error', err);
      } finally {
        if (mounted) setBootFinished(true);
      }
    };

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLoginSuccess = (profile: any, showToast: any) => {
    playNotificationSound();
    const profileId = profile.id;
    const profileName = resolveSmartName(profile);
    const profileEmail = asString(profile.usuario_email || profile.email || 'equipe@sistema');

    setActiveProfileId(profileId);
    trackAccess(profileId);

    const updatedSaved = [
      ...savedProfiles.filter((p) => p.id !== profileId),
      { id: profileId, name: profileName, email: profileEmail },
    ].slice(0, 5);

    setSavedProfiles(updatedSaved);
    localStorage.setItem('cm_saved_profiles', JSON.stringify(updatedSaved));
    localStorage.setItem('cm_session', JSON.stringify({ profileId, ts: Date.now() }));

    showToast(`Bem-vindo, ${profileName}!`, 'success');
  };

  const ensureAuthSession = async (email: string, password: string) => {
    const { data: s } = await supabase.auth.getSession();
    if (s?.session?.user?.id) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) devLog("Supabase Auth Warning:", error.message);
  };

  const submitLogin = async (
    setIsLoading: (v: boolean) => void,
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    setIsLoading(true);
    try {
      const userInput = (loginUser || '').trim();
      const pass = (loginPassword || '').trim();
      if (!userInput || !pass) throw new Error('Preencha usuário e senha.');

      requestBrowserNotificationPermission();

      let profile: any = null;
      try {
        const { data, error: rpcError } = await supabase.rpc('login_user', {
          p_email: userInput.toLowerCase(),
          p_password: pass,
        });
        if (!rpcError && data) profile = Array.isArray(data) ? data[0] : data;
      } catch (e) { devLog('RPC Login failed'); }

      if (!profile) {
        const { data: usersFound } = await supabase
            .from('perfis')
            .select('*')
            .or(`usuario_email.ilike."${userInput}",email.ilike."${userInput}",nome_operador.ilike."${userInput}"`);

        const validUser = usersFound?.find(u => u.senha_acesso === pass);
        if (!validUser) throw new Error('Usuário ou senha inválidos.');
        profile = validUser;
      }

      await ensureAuthSession(asString(profile.usuario_email || profile.email || userInput).toLowerCase(), pass);
      handleLoginSuccess(profile, showToast);
    } catch (err: any) {
      showToast(mapLoginError(err), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const submitTeamLogin = async (
    params: { document: string; phone: string; code: string },
    setIsLoading: (v: boolean) => void,
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    setIsLoading(true);
    try {
      const cleanDoc = onlyDigits(params.document);
      const cleanPhone = onlyDigits(params.phone);
      const cleanCode = params.code.trim();

      if (!cleanDoc || !cleanPhone || !cleanCode) throw new Error('Preencha todos os campos.');

      const { data: profiles, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('document', cleanDoc)
        .eq('access_code', cleanCode);

      if (error) throw error;
      const validProfile = profiles?.find((p) => onlyDigits(p.phone || '').includes(cleanPhone));
      if (!validProfile) throw new Error('Dados incorretos.');

      handleLoginSuccess(validProfile, showToast);
    } catch (err: any) {
      showToast(mapLoginError(err), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSavedProfile = (p: SavedProfile, showToast: any) => {
    playNotificationSound();
    setActiveProfileId(p.id);
    trackAccess(p.id);
    localStorage.setItem('cm_session', JSON.stringify({ profileId: p.id, ts: Date.now() }));
    showToast(`Bem-vindo de volta, ${p.name}!`, 'success');
  };

  const handleRemoveSavedProfile = (id: string) => {
    const updated = savedProfiles.filter((p) => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem('cm_saved_profiles', JSON.stringify(updated));
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setActiveProfileId(null);
    localStorage.removeItem('cm_session');
  };

  return {
    activeProfileId,
    setActiveProfileId,
    loginUser,
    setLoginUser,
    loginPassword,
    setLoginPassword,
    savedProfiles,
    submitLogin,
    submitTeamLogin,
    handleLogout,
    handleSelectSavedProfile,
    handleRemoveSavedProfile,
    bootFinished,
  };
};