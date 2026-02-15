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

  const trackAccess = async (profileId: string) => {
    if (!profileId || profileId === 'DEMO') return;
    try {
      // Incrementa acessos e atualiza timestamp de atividade
      await supabase.rpc('increment_profile_access', { p_profile_id: profileId });
    } catch (e) {
      console.warn("Falha ao registrar métrica de acesso", e);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('cm_saved_profiles');
    if (saved) {
      try {
        setSavedProfiles(JSON.parse(saved));
      } catch {}
    }

    const session = localStorage.getItem('cm_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed?.profileId) {
            setActiveProfileId(parsed.profileId);
            trackAccess(parsed.profileId);
        }
      } catch {
        localStorage.removeItem('cm_session');
      }
    }
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
    if (error) throw error;
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
      try {
        const { data, error: rpcError } = await supabase.rpc('login_user', {
          p_email: userInput.toLowerCase(),
          p_password: pass,
        });
        if (!rpcError && data) profile = Array.isArray(data) ? data[0] : data;
      } catch (e) { console.warn('RPC Login failed, falling back.', e); }

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
      const email = asString(profile.usuario_email || profile.email || userInput).toLowerCase();
      await ensureAuthSession(email, pass);
      handleLoginSuccess(profile, showToast);
    } catch (err: any) {
      const msg = err?.message || 'Desconhecido';
      showToast('Erro de conexão: ' + msg, 'error');
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
        setIsLoading(false);
        return;
      }
      handleLoginSuccess(validProfile, showToast);
    } catch (e: any) {
      showToast('Erro ao entrar: ' + e.message, 'error');
      setIsLoading(false);
    }
  };

  const handleSelectSavedProfile = (p: SavedProfile, showToast: any) => {
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
  };
};