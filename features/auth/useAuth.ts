
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { requestBrowserNotificationPermission } from '../../utils/notifications';
import { asString } from '../../utils/safe';

type SavedProfile = {
  id: string;
  name: string;
  email: string;
};

/**
 * Resolve o nome do usuário com a prioridade exata solicitada:
 * nome_exibicao -> nome_operador -> nome_completo -> nome -> name -> email -> 'Usuário'
 * Agora usa asString para segurança contra nulos.
 */
const resolveUserName = (p: any): string => {
  if (!p) return 'Usuário';
  return (
    asString(p.nome_exibicao) || 
    asString(p.nome_operador) || 
    asString(p.nome_empresa) || // Fallback
    asString(p.nome_completo) || 
    asString(p.nome) || 
    asString(p.name) || 
    asString(p.usuario_email) || 
    asString(p.email) || 
    'Usuário'
  );
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

    await requestBrowserNotificationPermission();

    try {
      let profile: any = null;

      // 1. Tenta via RPC (Garante retorno de todos os campos)
      const { data, error: rpcError } = await supabase.rpc('login_user', {
        login_input: user,
        password_input: pass,
      });

      if (!rpcError && data && data.length > 0) {
        profile = data[0];
      }

      // 2. Fallback Manual com normalização caso a RPC falhe
      if (!profile) {
        const { data: fallbackData } = await supabase
          .from('perfis')
          .select('*')
          .or(`usuario_email.ilike.${user},email.ilike.${user},nome_operador.ilike.${user},nome_exibicao.ilike.${user}`)
          .eq('senha_acesso', pass)
          .maybeSingle();
        
        profile = fallbackData;
      }

      if (!profile) {
        showToast('Usuário ou senha inválidos.', 'error');
        setIsLoading(false);
        return;
      }

      // LOGIN SUCESSO - Aplica hierarquia de nomes
      const profileId = profile.id;
      const profileName = resolveUserName(profile);
      const profileEmail = asString(profile.usuario_email || profile.email || user);

      setActiveProfileId(profileId);

      const updatedSaved = [
        ...savedProfiles.filter((p) => p.id !== profileId),
        { id: profileId, name: profileName, email: profileEmail },
      ].slice(0, 5);

      setSavedProfiles(updatedSaved);
      localStorage.setItem('cm_saved_profiles', JSON.stringify(updatedSaved));
      localStorage.setItem(
        'cm_session',
        JSON.stringify({ profileId: profileId, ts: Date.now() })
      );

      showToast(`Bem-vindo, ${profileName}!`, 'success');
    } catch (err) {
      console.error("Erro crítico no login:", err);
      showToast('Erro de conexão com o banco.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setActiveProfileId(null);
    localStorage.removeItem('cm_session');
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
    loginUser, setLoginUser,
    loginPassword, setLoginPassword,
    savedProfiles,
    submitLogin,
    handleLogout,
    handleSelectSavedProfile,
    handleRemoveSavedProfile,
  };
};
