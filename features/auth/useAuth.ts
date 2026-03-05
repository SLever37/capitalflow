// feature/auth/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { requestBrowserNotificationPermission } from '../../utils/notifications';
import { asString } from '../../utils/safe';
import { playNotificationSound } from '../../utils/notificationSound';
import { onlyDigits } from '../../utils/formatters';
import { isDev } from '../../utils/isDev';
import { isUUID, safeUUID } from '../../utils/uuid';

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
    return ['usuário','usuario','user','operador','admin','gestor','undefined','null','']
      .includes(clean);
  };

  const display = asString(p.nome_exibicao || p.display_name);
  if (display && !isGeneric(display)) return display;

  const operator = asString(p.nome_operador || p.name || p.nome);
  if (operator && !isGeneric(operator)) return operator;

  const business = asString(p.nome_empresa || p.business_name);
  if (business && !isGeneric(business)) return business;

  const full = asString(p.nome_completo || p.full_name);
  if (full && !isGeneric(full)) return full.split(' ')[0];

  const email = asString(p.usuario_email || p.email || p.auth_email);
  if (email && email.includes('@')) {
    const prefix = email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  return 'Gestor';
};

const mapLoginError = (err: any) => {
  let raw = String(err?.message || err || '');
  const l = raw.toLowerCase();

  if (
    l.includes('network') ||
    l.includes('failed to fetch') ||
    l.includes('load failed') ||
    l.includes('connection error')
  ) {
    return 'Falha de conexão. Verifique a internet.';
  }

  if (raw.startsWith('AUTH_SIGNIN_FAILED:')) {
    try {
      const jsonPart = raw.replace('AUTH_SIGNIN_FAILED: ', '');
      const details = JSON.parse(jsonPart);
      if (details.message) raw = details.message;
    } catch {}
  }

  const l2 = raw.toLowerCase();

  if (l2.includes('invalid login')) return 'Usuário ou senha inválidos.';
  if (l2.includes('invalid_credentials')) return 'Usuário ou senha inválidos.';
  if (l2.includes('email not confirmed')) return 'E-mail não confirmado.';
  if (l2.includes('refresh token not found') || l2.includes('invalid refresh token')) {
    return 'Sessão expirada. Faça login novamente.';
  }

  return raw || 'Erro desconhecido no login.';
};

export const useAuth = () => {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [bootFinished, setBootFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const trackAccess = async (profileId: string) => {
    const safeId = safeUUID(profileId);
    if (!safeId || safeId === 'DEMO') return;
    try {
      await supabase.rpc('increment_profile_access', { p_profile_id: safeId });
    } catch (e) {
      if (isDev) console.warn('[AUTH] Falha ao registrar acesso', e);
    }
  };

  const ensureAuthSession = async (email: string, pass: string) => {
    const cleanEmail = String(email || '').toLowerCase().trim();
    const cleanPass = String(pass || '');

    const { data: s, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      if (isDev) console.warn('[AUTH_SYNC] erro sessão:', sessionError.message);
      await supabase.auth.signOut().catch(() => {});
    }

    if (s?.session?.user?.email?.toLowerCase() === cleanEmail) {
      return;
    }

    if (s?.session) {
      await supabase.auth.signOut();
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });

    if (error) {
      throw new Error(
        `AUTH_SIGNIN_FAILED: ${JSON.stringify({
          message: error.message,
          status: (error as any).status,
          code: (error as any).code,
        })}`
      );
    }

    if (isDev) console.log('[AUTH_SYNC] sessão criada:', !!data?.session);
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const saved = localStorage.getItem('cm_saved_profiles');
        if (saved && mounted) {
          try {
            setSavedProfiles(JSON.parse(saved));
          } catch {}
        }

        const { data: authData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          const msg = sessionError.message || '';
          if (msg.includes('Refresh Token Not Found') || msg.toLowerCase().includes('invalid refresh token')) {
            localStorage.removeItem('cm_supabase_auth');
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            });
            await supabase.auth.signOut().catch(() => {});
            window.dispatchEvent(new Event('cm_auth_lost'));
          }
        }

        const session = localStorage.getItem('cm_session');
        if (session && mounted) {
          try {
            const parsed = JSON.parse(session);
            if (parsed?.profileId && parsed.profileId !== 'undefined' && parsed.profileId !== 'null') {
              setActiveProfileId(parsed.profileId);
              trackAccess(parsed.profileId);
            } else {
              localStorage.removeItem('cm_session');
            }
          } catch {
            localStorage.removeItem('cm_session');
          }
        } else if (authData?.session?.user && mounted) {
          // Usuário autenticado via OAuth (Google) mas sem sessão local
          const user = authData.session.user;
          let { data: profile } = await supabase.from('perfis').select('*').eq('user_id', user.id).maybeSingle();
          
          if (!profile) {
            // Cria o perfil automaticamente para novos usuários do Google
            const newProfile = {
                id: user.id,
                user_id: user.id,
                owner_profile_id: user.id,
                nome_operador: user.user_metadata?.full_name?.split(' ')[0] || 'Usuário',
                nome_completo: user.user_metadata?.full_name || 'Usuário Google',
                usuario_email: user.email,
                email: user.email,
                access_level: 1, 
                created_at: new Date().toISOString()
            };
            const { data: createdProfile, error: createError } = await supabase.from('perfis').insert([newProfile]).select().maybeSingle();
            if (!createError && createdProfile) {
              profile = createdProfile;
            }
          }

          if (profile) {
            setActiveProfileId(profile.id);
            trackAccess(profile.id);
            localStorage.setItem('cm_session', JSON.stringify({ profileId: profile.id, ts: Date.now() }));
            
            // Atualiza a lista de perfis salvos
            const profileName = resolveSmartName(profile);
            const profileEmail = asString(profile.usuario_email || profile.email || profile.auth_email) || user.email || '';
            const saved = localStorage.getItem('cm_saved_profiles');
            let savedProfilesList = [];
            if (saved) {
              try { savedProfilesList = JSON.parse(saved); } catch {}
            }
            const updated = [
              { id: profile.id, name: profileName, email: profileEmail },
              ...savedProfilesList.filter((p: any) => p.id !== profile.id),
            ].slice(0, 5);
            setSavedProfiles(updated);
            localStorage.setItem('cm_saved_profiles', JSON.stringify(updated));
          }
        }
      } finally {
        if (mounted) setBootFinished(true);
      }
    };

    boot();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (event, session) => {

        const ev = String(event); // 🔥 evita erro TS2367

        if (isDev) console.log('[AUTH EVENT]', ev, 'session?', !!session);

        if (ev === 'SIGNED_OUT' || ev === 'TOKEN_REFRESH_FAILED') {
          try {
            const { data: s1 } = await supabase.auth.getSession();
            if (s1?.session) {
              window.dispatchEvent(new Event('cm_auth_restored'));
              return;
            }

            const { data: s2 } = await supabase.auth.refreshSession();
            if (s2?.session) {
              window.dispatchEvent(new Event('cm_auth_restored'));
              return;
            }

            window.dispatchEvent(new Event('cm_auth_lost'));
          } catch {
            window.dispatchEvent(new Event('cm_auth_lost'));
          }
        }

        if (ev === 'TOKEN_REFRESHED' || ev === 'SIGNED_IN') {
          window.dispatchEvent(new Event('cm_auth_restored'));
        }
      });

    return () => {
      subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  const handleLoginSuccess = (profile: any, showToast: any) => {
    const profileId = profile.id;
    const profileName = resolveSmartName(profile);
    const profileEmail =
      asString(profile.usuario_email || profile.email || profile.auth_email) ||
      loginUser;

    setActiveProfileId(profileId);
    trackAccess(profileId);

    const updated = [
      { id: profileId, name: profileName, email: profileEmail },
      ...savedProfiles.filter((p) => p.id !== profileId),
    ].slice(0, 5);

    setSavedProfiles(updated);

    localStorage.setItem('cm_saved_profiles', JSON.stringify(updated));
    localStorage.setItem('cm_session', JSON.stringify({ profileId, ts: Date.now() }));

    showToast(`Bem-vindo, ${profileName}!`, 'success');
    playNotificationSound();

    window.dispatchEvent(new Event('cm_auth_restored'));
  };

  const submitLogin = async (
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    setIsLoading(true);
    try {
      const userInput = loginUser.trim();
      const pass = loginPassword.trim();
      const authPass = pass.length < 6 ? pass.padEnd(6, '0') : pass;

      if (!userInput || !pass) throw new Error('Preencha usuário e senha.');

      requestBrowserNotificationPermission();

      await ensureAuthSession(userInput, authPass);

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error('Sessão inválida.');

      let { data: profile } = await supabase
        .from('perfis')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (!profile) {
        // Tenta criar um perfil básico se não existir (fallback de segurança)
        const newProfile = {
          id: uid,
          user_id: uid,
          owner_profile_id: uid,
          nome_operador: userInput.split('@')[0],
          nome_completo: userInput.split('@')[0],
          usuario_email: userInput,
          email: userInput,
          access_level: 1,
          created_at: new Date().toISOString()
        };
        
        const { data: created, error: createError } = await supabase
          .from('perfis')
          .insert([newProfile])
          .select()
          .maybeSingle();
          
        if (createError || !created) {
          throw new Error('Perfil não encontrado e falha ao criar perfil automático.');
        }
        profile = created;
      }

      handleLoginSuccess(profile, showToast);
    } catch (err: any) {
      showToast(mapLoginError(err), 'error');
      window.dispatchEvent(new Event('cm_auth_lost'));
    } finally {
      setIsLoading(false);
    }
  };

  const submitTeamLogin = async (
    params: { document: string; phone: string; code: string },
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    setIsLoading(true);
    try {
      const cleanDoc = onlyDigits(params.document);
      const cleanCode = params.code.trim();
      if (!cleanDoc || !cleanCode) throw new Error('Preencha todos os campos.');

      const { data: loginData, error: loginError } = await supabase.rpc('resolve_team_login', {
        p_document: cleanDoc,
        p_pin: cleanCode,
      });

      if (loginError) throw loginError;
      if (!loginData) throw new Error('Dados de acesso à equipe incorretos.');

      const profile = loginData as any;
      const authEmail = (loginData as any).auth_email;
      if (!authEmail) throw new Error('Este perfil não possui e-mail vinculado para autenticação segura.');

      const authPass = cleanCode.length < 6 ? cleanCode.padEnd(6, '0') : cleanCode;

      const { data: fnData, error: fnError } = await supabase.functions.invoke('ensure_auth_user', {
        body: { profile_id: profile.id, email: authEmail, password: authPass },
      });

      if (fnError) throw new Error('Serviço de autenticação indisponível no momento.');
      if (!fnData?.ok) throw new Error(fnData?.error || 'Falha ao sincronizar credenciais de acesso.');

      await ensureAuthSession(authEmail, authPass);
      handleLoginSuccess(profile, showToast);
    } catch (err: any) {
      showToast(mapLoginError(err), 'error');
      window.dispatchEvent(new Event('cm_auth_lost'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSavedProfile = async (p: SavedProfile, showToast: any) => {
    const { data: s } = await supabase.auth.getSession();
    if (s.session && s.session.user.email?.toLowerCase() === p.email.toLowerCase()) {
      setActiveProfileId(p.id);
      trackAccess(p.id);
      localStorage.setItem('cm_session', JSON.stringify({ profileId: p.id, ts: Date.now() }));
      showToast(`Bem-vindo de volta, ${p.name}!`, 'success');
      playNotificationSound();
      window.dispatchEvent(new Event('cm_auth_restored'));
    } else {
      showToast('Sessão de segurança expirada. Digite sua senha.', 'warning');
      setLoginUser(p.email);
      window.dispatchEvent(new Event('cm_auth_lost'));
    }
  };

  const handleRemoveSavedProfile = (id: string) => {
    const updated = savedProfiles.filter((p) => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem('cm_saved_profiles', JSON.stringify(updated));
  };

  const handleLogout = async () => {
    setActiveProfileId(null);
    setBootFinished(true);

    localStorage.removeItem('cm_session');
    localStorage.removeItem('cm_supabase_auth');

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });

    await supabase.auth.signOut().catch(() => {});
    window.dispatchEvent(new Event('cm_auth_lost'));
  };

  const reauthenticate = async (password: string) => {
    if (!activeProfileId) throw new Error('Nenhum perfil ativo.');

    const profile = savedProfiles.find((p) => p.id === activeProfileId);
    if (!profile?.email) throw new Error('E-mail do perfil não encontrado. Faça login novamente.');

    await supabase.auth.signOut().catch(() => {});
    await ensureAuthSession(profile.email, password);
    window.dispatchEvent(new Event('cm_auth_restored'));
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
    reauthenticate,
    handleSelectSavedProfile,
    handleRemoveSavedProfile,
    bootFinished,
    isLoading,
  };
};