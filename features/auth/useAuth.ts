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
  const name =
    asString(p.nome_exibicao) ||
    asString(p.nome_operador) ||
    asString(p.nome_completo) ||
    asString(p.nome_empresa) ||
    asString(p.usuario_email || p.email);
  return name || 'Gestor';
};

const mapLoginError = (err: any) => {
  const msg = String(err?.message || err || '');
  const low = msg.toLowerCase();
  if (low.includes('invalid login') || low.includes('invalid email or password')) return 'Usuário ou senha inválidos.';
  if (low.includes('email not confirmed')) return 'E-mail não confirmado. Verifique sua caixa de entrada.';
  if (low.includes('network') || low.includes('failed to fetch')) return 'Falha de conexão. Verifique a internet.';
  return msg || 'Erro desconhecido no login.';
};

export const useAuth = () => {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [bootFinished, setBootFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const saveProfileLocally = (profile: any) => {
    try {
      const newProfile: SavedProfile = {
        id: profile.id,
        name: resolveSmartName(profile),
        email: asString(profile.usuario_email || profile.email),
      };
      setSavedProfiles((prev) => {
        const filtered = prev.filter((p) => p.id !== profile.id);
        const updated = [newProfile, ...filtered].slice(0, 5);
        localStorage.setItem('cm_saved_profiles', JSON.stringify(updated));
        return updated;
      });
    } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cm_saved_profiles');
      if (saved) setSavedProfiles(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const session = localStorage.getItem('cm_session');
        if (session && mounted) {
          try {
            const parsed = JSON.parse(session);
            if (parsed?.profileId) setActiveProfileId(parsed.profileId);
          } catch {
            localStorage.removeItem('cm_session');
          }
        }
      } finally {
        if (mounted) setBootFinished(true);
      }
    };
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Garante sessão válida no Auth (Client SDK) para habilitar RLS.
   * Se já existir sessão para o mesmo email, mantém. Se outro, troca.
   */
  const ensureAuthSession = async (email: string, pass: string) => {
    const { data: s } = await supabase.auth.getSession();
    const currentEmail = s?.session?.user?.email;

    if (currentEmail && currentEmail.toLowerCase() === email.toLowerCase()) {
      return; // Já logado corretamente
    }

    if (s?.session) {
      await supabase.auth.signOut();
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) throw error;
  };

  const handleLoginSuccess = (profile: any, showToast: any) => {
    setActiveProfileId(profile.id);
    localStorage.setItem('cm_session', JSON.stringify({ profileId: profile.id, ts: Date.now() }));
    
    // Limpa cache antigo para garantir dados frescos
    Object.keys(localStorage)
      .filter((k) => k.startsWith('cm_cache_'))
      .forEach((k) => localStorage.removeItem(k));

    saveProfileLocally(profile);
    showToast(`Bem-vindo, ${resolveSmartName(profile)}!`, 'success');
    playNotificationSound();
  };

  /**
   * LOGIN HÍBRIDO:
   * 1) Resolve via RPC (Banco) -> obtém dados seguros
   * 2) Provisiona via Edge Function (Admin) -> garante Auth User
   * 3) Loga via Client SDK -> estabelece sessão RLS
   */
  const submitLogin = async (showToast: (msg: string, type?: any) => void) => {
    setIsLoading(true);
    try {
      const userInput = (loginUser || '').trim();
      const passInput = (loginPassword || '').trim();

      if (!userInput || !passInput) throw new Error('Preencha usuário e senha.');

      requestBrowserNotificationPermission();

      // 1. Resolver credenciais no Banco (independente do Auth)
      const { data: resolved, error: rpcError } = await supabase.rpc('resolve_profile_login', {
        p_email: userInput, // Aceita user ou email dependendo da implementação da RPC
        p_password: passInput
      });

      if (rpcError) {
        if (isDev) console.error('RPC Error:', rpcError);
        throw new Error('Erro ao validar credenciais no servidor.');
      }

      if (!resolved || !resolved.profile_id) {
        throw new Error('Usuário ou senha inválidos.');
      }

      const { profile_id, auth_email, auth_password } = resolved;
      
      // Senha Auth: se a senha original for PIN curto (<6), completa com zeros
      // Se a RPC já retornar a senha de auth correta, usamos ela
      let finalAuthPass = auth_password || passInput;
      if (finalAuthPass.length < 6) finalAuthPass = finalAuthPass.padEnd(6, '0');

      // 2. Garantir usuário no Auth via Edge Function (Admin Context)
      const { data: fnData, error: fnError } = await supabase.functions.invoke('ensure_auth_user', {
        body: JSON.stringify({
          profile_id: profile_id,
          email: auth_email,
          password: finalAuthPass
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (fnError) {
        if (isDev) console.error('Edge Function Error:', fnError);
        throw new Error('Serviço de autenticação indisponível no momento.');
      }

      if (!fnData?.ok) {
        throw new Error(fnData?.error || 'Falha na sincronização de acesso.');
      }

      // 3. Criar Sessão Cliente (Habilita RLS)
      await ensureAuthSession(auth_email, finalAuthPass);

      // 4. Buscar Perfil validado pelo RLS (user_id = auth.uid())
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Sessão não estabelecida.');

      const { data: profile, error: profError } = await supabase
        .from('perfis')
        .select('*')
        .eq('user_id', userAuth.user.id)
        .maybeSingle();

      if (profError || !profile) {
        throw new Error('Perfil de acesso não localizado (vínculo user_id pendente).');
      }

      handleLoginSuccess(profile, showToast);

    } catch (err: any) {
      showToast(mapLoginError(err), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const submitTeamLogin = async (
    params: { document: string; phone: string; code: string },
    showToast: (msg: string, type?: any) => void
  ) => {
    setIsLoading(true);
    try {
      const cleanDoc = onlyDigits(params.document);
      const cleanCode = (params.code || '').trim();

      if (!cleanDoc || !cleanCode) throw new Error('Preencha todos os campos.');

      // 1. Resolve via RPC de Equipe
      const { data: loginData, error: loginError } = await supabase.rpc('resolve_team_login', {
        p_document: cleanDoc,
        p_pin: cleanCode,
      });

      if (loginError) throw loginError;
      if (!loginData) throw new Error('Dados de acesso à equipe incorretos.');

      const profile = loginData;
      const authEmail = loginData.auth_email;
      // Garante senha mínima 6 chars para Auth
      const authPass = cleanCode.length < 6 ? cleanCode.padEnd(6, '0') : cleanCode;

      if (!authEmail) throw new Error('Perfil de equipe sem e-mail vinculado.');

      // 2. Provisiona Auth
      const { data: fnData, error: fnError } = await supabase.functions.invoke('ensure_auth_user', {
        body: JSON.stringify({
          profile_id: profile.id,
          email: authEmail,
          password: authPass
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (fnError || !fnData?.ok) {
        throw new Error('Falha ao sincronizar acesso de equipe.');
      }

      // 3. Loga Sessão
      await ensureAuthSession(authEmail, authPass);

      handleLoginSuccess(profile, showToast);
    } catch (e: any) {
      showToast(mapLoginError(e), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSavedProfile = (p: SavedProfile, showToast: any) => {
    setLoginUser(p.email);
    showToast(`Usuário ${p.name} selecionado. Digite a senha.`, 'info');
  };

  const handleRemoveSavedProfile = (id: string) => {
    setSavedProfiles((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('cm_saved_profiles', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('cm_session');
    setActiveProfileId(null);
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
    handleSelectSavedProfile,
    handleRemoveSavedProfile,
    handleLogout,
    bootFinished,
    isLoading,
  };
};