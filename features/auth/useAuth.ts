
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
  return 'Gestor';
};

export const useAuth = () => {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('cm_saved_profiles');
    if (saved) {
      try { setSavedProfiles(JSON.parse(saved)); } catch {}
    }
    const session = localStorage.getItem('cm_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed?.profileId) setActiveProfileId(parsed.profileId);
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
    setLoginError(null);

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
    try {
      const { data: s } = await supabase.auth.getSession();
      if (s?.session?.user?.id) return;

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
            throw new Error("Credenciais de autenticação base falharam. O usuário pode não estar registrado no serviço de Auth.");
        }
        throw error;
      }
    } catch (e: any) {
      console.warn("Aviso de Auth Session:", e.message);
      // Não bloqueia se o perfil local for válido, mas avisa
    }
  };

  const submitLogin = async (
    setIsLoading: (v: boolean) => void,
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    setIsLoading(true);
    setLoginError(null);
    const userInput = loginUser.trim();
    const pass = loginPassword.trim();

    if (!userInput || !pass) {
      setLoginError("Informe o usuário e a senha para continuar.");
      setIsLoading(false);
      return;
    }

    try {
      let profile: any = null;
      
      // 1. Tenta via RPC (Lógica customizada de login)
      const { data: rpcData, error: rpcError } = await supabase.rpc('login_user', {
        p_email: userInput.toLowerCase(),
        p_password: pass,
      });

      if (!rpcError && rpcData) {
        profile = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      }

      // 2. Fallback: Busca direta na tabela de perfis
      if (!profile) {
        const { data: tableData, error: tableError } = await supabase
          .from('perfis')
          .select('*')
          .or(`usuario_email.ilike."${userInput}",nome_operador.ilike."${userInput}"`)
          .eq('senha_acesso', pass)
          .maybeSingle();

        if (tableError) throw tableError;
        profile = tableData;
      }

      if (!profile) {
        setLoginError("Usuário ou senha incorretos. Verifique os dados e tente novamente.");
        setIsLoading(false);
        return;
      }

      // 3. Tenta sincronizar sessão de Auth (Opcional para funcionamento da tabela, mas bom para storage/RPCs)
      const email = asString(profile.usuario_email || profile.email || userInput).toLowerCase();
      if (email.includes('@')) {
        await ensureAuthSession(email, pass);
      }

      handleLoginSuccess(profile, showToast);
    } catch (err: any) {
      console.error('Erro crítico no login:', err);
      const msg = err?.message || 'Desconhecido';
      setLoginError("Erro de conexão com o servidor. Verifique sua internet.");
      showToast('Falha técnica: ' + msg, 'error');
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
    setLoginError(null);
    try {
      const cleanDoc = onlyDigits(params.document);
      const cleanPhone = onlyDigits(params.phone);
      const cleanCode = params.code.trim();

      if (!cleanDoc || !cleanPhone || !cleanCode) {
        setLoginError("Preencha CPF, Telefone e Código de Acesso.");
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
        setLoginError("Dados de acesso à equipe incorretos. Verifique com seu supervisor.");
        return;
      }

      handleLoginSuccess(validProfile, showToast);
    } catch (e: any) {
      setLoginError("Falha ao validar acesso de equipe.");
      showToast('Erro: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setActiveProfileId(null);
    localStorage.removeItem('cm_session');
  };

  // Fix: Added missing handleSelectSavedProfile to restore session from a saved profile list
  const handleSelectSavedProfile = (p: SavedProfile, showToast: any) => {
    setActiveProfileId(p.id);
    localStorage.setItem('cm_session', JSON.stringify({ profileId: p.id, ts: Date.now() }));
    showToast(`Bem-vindo de volta, ${p.name}!`, 'success');
  };

  // Fix: Added missing handleRemoveSavedProfile to allow users to clear entries from the login screen
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
    loginError,
    savedProfiles,
    submitLogin,
    submitTeamLogin,
    handleLogout,
    handleSelectSavedProfile,
    handleRemoveSavedProfile,
  };
};
