
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { requestBrowserNotificationPermission } from '../../utils/notifications';
import { asString } from '../../utils/safe';
import { playNotificationSound } from '../../utils/notificationSound';

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

  // 1. Tenta Nome de Exibição (Prioridade Máxima do BD)
  const display = asString(p.nome_exibicao);
  if (display && !isGeneric(display)) return display;

  // 2. Tenta Nome do Operador
  const operator = asString(p.nome_operador);
  if (operator && !isGeneric(operator)) return operator;

  // 3. Tenta Nome da Empresa
  const business = asString(p.nome_empresa);
  if (business && !isGeneric(business)) return business;

  // 4. Tenta Primeiro Nome Completo
  const full = asString(p.nome_completo);
  if (full && !isGeneric(full)) return full.split(' ')[0];

  // 5. Tenta parte do E-mail (Sempre único e seguro)
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

      // 1. Tenta via RPC (Padrão e Mais Seguro)
      try {
        const { data, error: rpcError } = await supabase.rpc('login_user', {
            login_input: user,
            password_input: pass,
        });

        if (!rpcError && data && data.length > 0) {
            profile = data[0];
        }
      } catch (e) {
        console.warn("RPC Login failed, falling back.", e);
      }

      // 2. Fallback Manual Seguro (Se RPC falhar ou retornar vazio)
      if (!profile) {
        const { data: fallbackData } = await supabase
          .from('perfis')
          .select('*')
          .or(`usuario_email.ilike.${user},email.ilike.${user},nome_operador.ilike.${user}`)
          .eq('senha_acesso', pass)
          .maybeSingle();
        
        profile = fallbackData;
      }

      if (!profile) {
        showToast('Usuário ou senha inválidos.', 'error');
        setIsLoading(false);
        return;
      }

      // LOGIN SUCESSO - Resolve o nome imediatamente
      playNotificationSound();
      
      const profileId = profile.id;
      const profileName = resolveSmartName(profile); 
      const profileEmail = asString(profile.usuario_email || profile.email || user);

      setActiveProfileId(profileId);

      // Atualiza lista de perfis salvos
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
    } catch (err: any) {
      console.error("Erro crítico no login:", err);
      showToast('Erro de conexão: ' + (err.message || 'Desconhecido'), 'error');
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
