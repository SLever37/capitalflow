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

    // ✅ sessão local do seu app (perfis)
    const session = localStorage.getItem('cm_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed?.profileId) setActiveProfileId(parsed.profileId);
      } catch {
        localStorage.removeItem('cm_session');
      }
    }

    // ✅ importante: Supabase Auth restaura sessão sozinho (se já existiu login antes)
    // não precisa fazer nada aqui.
  }, []);

  // ✅ garante sessão auth (para Storage/Realtime/Policies authenticated)
  const ensureSupabaseAuth = async (
    email: string,
    password: string,
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    // se já tem sessão, ok
    const { data: sess } = await supabase.auth.getSession();
    if (sess?.session?.user?.id) return true;

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (error) {
      // Não bloqueia o login do sistema, mas avisa:
      showToast(
        'Login OK no sistema, mas o Supabase Auth não está logado. O chat/áudios exigem Auth. Crie este usuário em Authentication → Users com o mesmo email/senha.',
        'warning'
      );
      return false;
    }
    return true;
  };

  // ✅ para logins sem senha (equipe/portal interno), tenta auth anônimo (se habilitado)
  const ensureAnonymousAuth = async (
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    const { data: sess } = await supabase.auth.getSession();
    if (sess?.session?.user?.id) return true;

    // @ts-ignore (depende da versão do sdk, mas existe no supabase-js v2)
    const { error } = await supabase.auth.signInAnonymously?.();
    if (error) {
      showToast(
        'Entrou no sistema, mas sem Supabase Auth. Para chat/áudio, habilite Anonymous Sign-ins ou use usuário/senha no Auth.',
        'warning'
      );
      return false;
    }
    return true;
  };

  const handleLoginSuccess = (profile: any, showToast: any, authOk: boolean) => {
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

    localStorage.setItem(
      'cm_session',
      JSON.stringify({
        profileId,
        ts: Date.now(),
        authOk, // ✅ só pra debug
      })
    );

    showToast(`Bem-vindo, ${profileName}!`, 'success');
  };

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

      // 1) RPC login
      try {
        const { data, error: rpcError } = await supabase.rpc('login_user', {
          p_email: userInput.toLowerCase(),
          p_password: pass,
        });

        if (!rpcError && data) profile = Array.isArray(data) ? data[0] : data;
      } catch (e) {
        console.warn('RPC Login failed, falling back.', e);
      }

      // 2) fallback manual
      if (!profile) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('perfis')
          .select('*')
          .or(`usuario_email.ilike."${userInput}",nome_operador.ilike."${userInput}"`)
          .eq('senha_acesso', pass)
          .maybeSingle();

        if (!fallbackError && fallbackData) profile = fallbackData;
      }

      if (!profile) {
        showToast('Usuário ou senha inválidos.', 'error');
        setIsLoading(false);
        return;
      }

      // ✅ NOVO: garante sessão Supabase Auth (necessário pro chat/áudio/storage privado)
      const email = asString(profile.usuario_email || profile.email || userInput).trim().toLowerCase();
      const authOk = await ensureSupabaseAuth(email, pass, showToast);

      handleLoginSuccess(profile, showToast, authOk);
    } catch (err: any) {
      console.error('Erro crítico no login:', err);
      showToast('Erro de conexão: ' + (err.message || 'Desconhecido'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

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

      // ✅ NOVO: tenta sessão anônima (se habilitado) para permitir chat/áudio
      const authOk = await ensureAnonymousAuth(showToast);

      handleLoginSuccess(validProfile, showToast, authOk);
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

    // ✅ NOVO: encerra Supabase Auth também
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