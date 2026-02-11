// features/auth/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { requestBrowserNotificationPermission } from '../../utils/notifications';
import { asString } from '../../utils/safe';
import { playNotificationSound } from '../../utils/notificationSound';
import { onlyDigits } from '../../utils/formatters';

type SavedProfile = {
  id: string;
  name: string;
  email: string;
};

/**
 * Resolve o nome de EXIBIÇÃO de forma inteligente.
 * Ignora termos genéricos como "Usuário" ou "Operador" se houver dados melhores.
 */
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

export const useAuth = () => {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('cm_saved_profiles');
    if (saved) {
      try {
        setSavedProfiles(JSON.parse(saved));
      } catch {}
    }

    // 1) tenta restaurar sessão REAL do Supabase Auth
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id || null;

        // Se existe sessão real, usa ela como "activeProfileId"
        if (uid) {
          setActiveProfileId(uid);
          localStorage.setItem('cm_session', JSON.stringify({ profileId: uid, ts: Date.now() }));
          return;
        }
      } catch {}

      // 2) fallback: sessão local (legado)
      const session = localStorage.getItem('cm_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed?.profileId) {
            setActiveProfileId(parsed.profileId);
          }
        } catch {
          localStorage.removeItem('cm_session');
        }
      }
    })();
  }, []);

  const handleLoginSuccess = (profile: any, showToast: any) => {
    playNotificationSound();

    const profileId = profile.id;
    const profileName = resolveSmartName(profile);
    const profileEmail = asString(profile.usuario_email || profile.email || 'equipe@sistema');

    setActiveProfileId(profileId);

    const updatedSaved = [
      ...savedProfiles.filter((p) => p.id !== profileId),
      { id: profileId, name: profileName, email: profileEmail },
    ].slice(0, 5);

    setSavedProfiles(updatedSaved);
    localStorage.setItem('cm_saved_profiles', JSON.stringify(updatedSaved));
    localStorage.setItem('cm_session', JSON.stringify({ profileId: profileId, ts: Date.now() }));

    showToast(`Bem-vindo, ${profileName}!`, 'success');
  };

  /**
   * CRÍTICO: garante sessão do Supabase Auth,
   * senão auth.uid() = null e o RLS bloqueia clientes/contratos/fontes/etc.
   */
  const ensureSupabaseAuthSession = async (
    email: string,
    password: string,
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const alreadyLogged = !!sessionData?.session?.user?.id;
    if (alreadyLogged) return;

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      // Não trava o app inteiro, mas avisa que sem Auth o RLS vai bloquear tudo
      showToast(
        'Login OK no perfil, mas falhou no Supabase Auth. Sem sessão Auth, o RLS bloqueia clientes/contratos. Crie/ajuste o usuário no Auth (mesmo e-mail/senha).',
        'warning'
      );
    }
  };

  // Login Padrão (Gestor)
  const submitLogin = async (
    setIsLoading: (v: boolean) => void,
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    setIsLoading(true);

    const userInput = loginUser.trim();
    const pass = loginPassword.trim();

    if (!userInput || !pass) {
      showToast('Informe usuário e senha.', 'warning');
      setIsLoading(false);
      return;
    }

    await requestBrowserNotificationPermission();

    try {
      let profile: any = null;

      // 1) Tenta via RPC
      try {
        const { data, error: rpcError } = await supabase.rpc('login_user', {
          p_email: userInput.toLowerCase(),
          p_password: pass,
        });

        if (!rpcError && data) {
          profile = Array.isArray(data) ? data[0] : data;
        }
      } catch (e) {
        console.warn('RPC Login failed, falling back.', e);
      }

      // 2) Fallback manual
      if (!profile) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('perfis')
          .select('*')
          .or(`usuario_email.ilike."${userInput}",nome_operador.ilike."${userInput}"`)
          .eq('senha_acesso', pass)
          .maybeSingle();

        if (!fallbackError && fallbackData) {
          profile = fallbackData;
        }
      }

      if (!profile) {
        showToast('Usuário ou senha inválidos.', 'error');
        setIsLoading(false);
        return;
      }

      // ✅ GARANTE auth.uid() NO FRONTEND (RLS)
      await ensureSupabaseAuthSession(profile.usuario_email || userInput, pass, showToast);

      handleLoginSuccess(profile, showToast);
    } catch (err: any) {
      console.error('Erro crítico no login:', err);
      showToast('Erro de conexão: ' + (err.message || 'Desconhecido'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Login de Equipe (Sem Senha)
  const submitTeamLogin = async (
    params: { document: string; phone: string; code: string },
    setIsLoading: (v: boolean) => void,
    showToast: (msg: string, type?: any) => void
  ) => {
    setIsLoading(true);
    try {
      const cleanDoc = onlyDigits(params.document);
      const cleanPhone = onlyDigits(params.phone);
      const cleanCode = params.code.trim();

      if (!cleanDoc || !cleanPhone || !cleanCode) {
        showToast('Preencha todos os campos para entrar.', 'warning');
        setIsLoading(false);
        return;
      }

      const { data: profiles, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('document', cleanDoc)
        .eq('access_code', cleanCode);

      if (error) throw error;

      const validProfile = profiles?.find((p) => {
        const dbPhone = onlyDigits(p.phone || '');
        return dbPhone.includes(cleanPhone) || cleanPhone.includes(dbPhone);
      });

      if (!validProfile) {
        showToast('Dados incorretos. Verifique CPF, Telefone e Código.', 'error');
        return;
      }

      // Aqui NÃO tem senha, então não dá pra criar sessão Auth por signInWithPassword.
      // Portal/equipe normalmente precisa rota pública/token ou outro método.
      handleLoginSuccess(validProfile, showToast);
    } catch (e: any) {
      console.error(e);
      showToast('Erro ao entrar: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setActiveProfileId(null);
    localStorage.removeItem('cm_session');
    try {
      await supabase.auth.signOut();
    } catch {}
  };

  const handleSelectSavedProfile = (profile: SavedProfile, showToast: (msg: string) => void) => {
    setLoginUser(profile.email || profile.name);
    setLoginPassword('');
    showToast(`Olá ${profile.name}, digite sua senha.`);
  };

  const handleRemoveSavedProfile = (id: string) => {
    const updated = savedProfiles.filter((p) => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem('cm_saved_profiles', JSON.stringify(updated));
  };

  return {
    activeProfileId,
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
  };
};