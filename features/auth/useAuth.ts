import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  requestBrowserNotificationPermission,
  fireBrowserNotification,
} from '../../utils/notifications';

type SavedProfile = {
  id: string;
  name: string;
  email: string;
};

export const useAuth = () => {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);

  // =====================================================
  // INIT
  // =====================================================
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
        }
      } catch {
        localStorage.removeItem('cm_session');
      }
    }
  }, []);

  // =====================================================
  // LOGIN
  // =====================================================
  const submitLogin = async (
    setIsLoading: (v: boolean) => void,
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    setIsLoading(true);

    const user = loginUser.trim();
    const pass = loginPassword.trim();

    if (!user || !pass) {
      showToast('Informe usuário e senha.', 'warning');
      setIsLoading(false);
      return;
    }

    // 🔔 pede permissão de notificação no clique
    await requestBrowserNotificationPermission();

    try {
      let profile: any = null;

      // ===============================
      // 1) TENTATIVA VIA RPC (SE EXISTIR)
      // ===============================
      try {
        const { data, error } = await supabase.rpc('login_user', {
          login_input: user,
          password_input: pass,
        });

        if (!error && data) profile = data;
      } catch {
        // segue fallback
      }

      // ===============================
      // 2) FALLBACK DIRETO NO PERFIS
      // ===============================
      if (!profile) {
        const { data, error } = await supabase
          .from('perfis')
          .select('*')
          .or(`usuario_email.eq.${user},nome_operador.eq.${user}`);

        if (!error && data?.length) {
          profile = data.find((p: any) => p.senha_acesso === pass);
        }
      }

      // ===============================
      // FALHA
      // ===============================
      if (!profile) {
        const msg = 'Usuário ou senha inválidos.';
        showToast(msg, 'error');
        fireBrowserNotification('Erro de login', msg);
        setIsLoading(false);
        return;
      }

      // ===============================
      // SUCESSO
      // ===============================
      setActiveProfileId(profile.id);

      const updatedSaved = [
        ...savedProfiles.filter((p) => p.id !== profile.id),
        {
          id: profile.id,
          name: profile.nome_operador || 'Usuário',
          email: profile.usuario_email || '',
        },
      ].slice(0, 5);

      setSavedProfiles(updatedSaved);
      localStorage.setItem('cm_saved_profiles', JSON.stringify(updatedSaved));
      localStorage.setItem(
        'cm_session',
        JSON.stringify({ profileId: profile.id, ts: Date.now() })
      );

      const okMsg = `Bem-vindo, ${profile.nome_operador || 'usuário'}!`;
      showToast(okMsg, 'success');
      fireBrowserNotification('Login realizado', okMsg);
    } catch (err) {
      const msg = 'Erro de conexão com o servidor.';
      showToast(msg, 'error');
      fireBrowserNotification('Erro', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================
  const handleLogout = () => {
    setActiveProfileId(null);
    localStorage.removeItem('cm_session');
  };

  // =====================================================
  // PERFIS SALVOS
  // =====================================================
  const handleSelectSavedProfile = (
    profile: SavedProfile,
    showToast: (msg: string) => void
  ) => {
    setLoginUser(profile.email);
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
    setActiveProfileId,
    loginUser,
    setLoginUser,
    loginPassword,
    setLoginPassword,
    savedProfiles,
    submitLogin,
    handleLogout,
    handleSelectSavedProfile,
    handleRemoveSavedProfile,
  };
};