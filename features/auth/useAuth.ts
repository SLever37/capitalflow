// feature/auth/useAuth.ts
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
  const raw = String(err?.message || err || '');

  // ✅ NÃO mascarar: mostra o erro real do Auth quando vier do ensureAuthSession
  if (raw.startsWith('AUTH_SIGNIN_FAILED:')) return raw;

  const l = raw.toLowerCase();
  if (l.includes('invalid login')) return 'Usuário ou senha inválidos.';
  if (l.includes('invalid_credentials')) return 'Usuário ou senha inválidos.';
  if (l.includes('email not confirmed')) return 'E-mail não confirmado. Verifique sua caixa de entrada.';
  if (l.includes('network') || l.includes('failed to fetch')) return 'Falha de conexão. Verifique a internet.';
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
    if (!profileId || profileId === 'DEMO') return;
    try {
      await supabase.rpc('increment_profile_access', { p_profile_id: profileId });
    } catch (e) {
      if (isDev) console.warn('[AUTH] Falha ao registrar acesso', e);
    }
  };

  /**
   * Cria sessão no Supabase Auth (necessário para atravessar RLS).
   * Se falhar, lança AUTH_SIGNIN_FAILED com detalhes (sem mascarar).
   */
  const ensureAuthSession = async (email: string, pass: string) => {
    const cleanEmail = String(email || '').toLowerCase().trim();
    const cleanPass = String(pass || '');

    const { data: s } = await supabase.auth.getSession();

    // mesma sessão já ativa
    if (s?.session?.user?.email?.toLowerCase() === cleanEmail) {
      if (isDev) console.log('[AUTH_SYNC] Sessão já ativa para:', cleanEmail);
      return;
    }

    // sessão de outro user -> signOut antes
    if (s?.session) {
      await supabase.auth.signOut();
    }

    if (isDev) console.log('[LOGIN] signInWithPassword email/passlen:', cleanEmail, cleanPass.length);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });

    if (error) {
      const details = {
        message: error.message,
        status: (error as any).status,
        name: (error as any).name,
        code: (error as any).code,
      };
      if (isDev) console.error('[AUTH_SYNC] signInWithPassword error:', details);
      throw new Error(`AUTH_SIGNIN_FAILED: ${JSON.stringify(details)}`);
    }

    if (isDev) console.log('[AUTH_SYNC] signIn ok:', !!data?.session);
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

        const { data: s, error: sessionError } = await supabase.auth.getSession();

        // token inválido -> limpa
        if (sessionError) {
          if (isDev) console.warn('[BOOT] Auth Session Error:', sessionError.message);

          if (
            sessionError.message.includes('Refresh Token Not Found') ||
            sessionError.message.includes('Invalid Refresh Token')
          ) {
            localStorage.removeItem('cm_session');
            localStorage.removeItem('cm_supabase_auth');
            await supabase.auth.signOut().catch(() => {});
            if (mounted) {
              setActiveProfileId(null);
              setBootFinished(true);
            }
            return;
          }
        }

        const session = localStorage.getItem('cm_session');
        if (session && mounted) {
          try {
            const parsed = JSON.parse(session);
            const hasAuth = !!s?.session?.user?.id;

            // se não tem auth, não restaura profile (evita travar) — exceto DEMO
            if (!hasAuth && parsed?.profileId !== 'DEMO') {
              localStorage.removeItem('cm_session');
              setActiveProfileId(null);
              return;
            }

            if (parsed?.profileId) {
              setActiveProfileId(parsed.profileId);
              trackAccess(parsed.profileId);
            }
          } catch {
            localStorage.removeItem('cm_session');
          }
        }
      } catch (err) {
        if (isDev) console.error('[BOOT] Erro:', err);
        localStorage.removeItem('cm_session');
        setActiveProfileId(null);
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
    const profileId = profile.id;
    let profileName = resolveSmartName(profile);
    let profileEmail = asString(profile.usuario_email || profile.email || profile.auth_email);

    // Fallback inteligente usando o input de login
    if (!profileEmail && loginUser.includes('@')) {
      profileEmail = loginUser;
    }
    if (!profileEmail) profileEmail = 'equipe@sistema';

    // Se resolveSmartName retornou 'Gestor' (genérico) e o login foi via username, usa o username
    if (profileName === 'Gestor' && loginUser && !loginUser.includes('@')) {
      profileName = loginUser;
    }

    setActiveProfileId(profileId);
    trackAccess(profileId);

    const updatedSaved = [
      { id: profileId, name: profileName, email: profileEmail },
      ...savedProfiles.filter((p) => p.id !== profileId),
    ].slice(0, 5);

    setSavedProfiles(updatedSaved);
    localStorage.setItem('cm_saved_profiles', JSON.stringify(updatedSaved));
    localStorage.setItem('cm_session', JSON.stringify({ profileId, ts: Date.now() }));

    Object.keys(localStorage)
      .filter((k) => k.startsWith('cm_cache_'))
      .forEach((k) => localStorage.removeItem(k));

    showToast(`Bem-vindo, ${profileName}!`, 'success');
    playNotificationSound();
  };

  const submitLogin = async (
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    setIsLoading(true);

    try {
      const userInput = (loginUser || '').trim();
      const pass = (loginPassword || '').trim();

      // Supabase Auth exige >= 6
      const authPass = pass.length < 6 ? pass.padEnd(6, '0') : pass;

      if (!userInput || !pass) throw new Error('Preencha usuário e senha.');
      requestBrowserNotificationPermission();

      // =========================================================
      // 1) PERFIL (nível 2/3) via RPC (com fallback se RPC quebrar)
      // =========================================================
      let profileLogin: any = null;

      try {
        const { data, error } = await supabase.rpc('resolve_profile_login', {
          p_identifier: userInput,
          p_password: pass,
        });

        if (isDev) {
          console.log('[RPC resolve_profile_login] error:', error);
          console.log('[RPC resolve_profile_login] data:', data);
        }

        if (!error && data) profileLogin = data;

        if (error && isDev) {
          console.warn('[AUTH] resolve_profile_login falhou, seguindo fallback...', error);
        }
      } catch (rpcError) {
        if (isDev) console.warn('[AUTH] Erro chamando resolve_profile_login, seguindo fallback...', rpcError);
      }

      if (isDev) console.log('[LOGIN] profileLogin:', profileLogin);

      if (profileLogin) {
        const profile = profileLogin as any;
        const authEmail = String(profile.auth_email || '').trim();

        if (!authEmail || !authEmail.includes('@')) {
          throw new Error('Perfil sem e-mail válido para autenticação.');
        }

        if (isDev) {
          console.log('[LOGIN] calling ensure_auth_user with:', {
            profile_id: profile.id,
            email: authEmail,
            password: authPass,
          });
        }

        // 1.1) Sincroniza credencial no Auth (Edge Function)
        const { data: fnData, error: fnError } = await supabase.functions.invoke('ensure_auth_user', {
          body: {
            profile_id: profile.id,
            email: authEmail,
            password: authPass,
          },
        });

        if (isDev) console.log('[LOGIN] ensure_auth_user result:', { fnError, fnData });

        if (fnError) throw new Error('Serviço de autenticação indisponível no momento.');
        if (!fnData?.ok) throw new Error(fnData?.error || 'Falha ao sincronizar credenciais de acesso.');

        // 1.2) Cria sessão Auth (RLS)
        await ensureAuthSession(authEmail, authPass);

        // 1.3) Loga no app
        handleLoginSuccess(profile, showToast);
        return;
      }

      // =========================================================
      // 2) FALLBACK: AUTH DIRETO (nível 1 / master ou legado)
      // =========================================================
      let emailForAuth = userInput;

      if (!userInput.includes('@')) {
        try {
          const { data: resolvedEmail, error: resolveErr } = await supabase.rpc('resolve_login_email_by_operator', {
            p_operator: userInput,
          });
          if (!resolveErr && resolvedEmail) emailForAuth = String(resolvedEmail);
        } catch (e) {
          if (isDev) console.warn('[AUTH] Falha ao resolver e-mail por operador (fallback continua):', e);
        }
      }

      await ensureAuthSession(emailForAuth, authPass);

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error('Sessão inválida. Faça login novamente.');

      // ✅ CapitalFlow usa "perfis"
      const { data: profile, error: profError } = await supabase
        .from('perfis')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (profError || !profile) {
        throw new Error('Perfil de acesso não localizado no banco de dados (user_id não vinculado).');
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
        body: {
          profile_id: profile.id,
          email: authEmail,
          password: authPass,
        },
      });

      if (fnError) throw new Error('Serviço de autenticação indisponível no momento.');
      if (!fnData?.ok) throw new Error(fnData?.error || 'Falha ao sincronizar credenciais de acesso.');

      await ensureAuthSession(authEmail, authPass);
      handleLoginSuccess(profile, showToast);
    } catch (err: any) {
      showToast(mapLoginError(err), 'error');
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
    } else {
      showToast('Sessão de segurança expirada. Digite sua senha.', 'warning');
      setLoginUser(p.email);
    }
  };

  const handleRemoveSavedProfile = (id: string) => {
    const updated = savedProfiles.filter((p) => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem('cm_saved_profiles', JSON.stringify(updated));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    isLoading,
  };
};