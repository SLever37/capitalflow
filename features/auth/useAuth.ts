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

const mapLoginError = (err: any) => {
  const msg = String(err?.message || err || '');
  if (msg.toLowerCase().includes('invalid login')) return 'Usuário ou senha inválidos.';
  if (msg.toLowerCase().includes('email not confirmed')) return 'E-mail não confirmado. Verifique sua caixa de entrada.';
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch'))
    return 'Falha de conexão. Verifique a internet.';
  return msg || 'Erro desconhecido no login.';
};

export const useAuth = () => {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [bootFinished, setBootFinished] = useState(false);

  const trackAccess = async (profileId: string) => {
    if (!profileId || profileId === 'DEMO') return;
    try {
      await supabase.rpc('increment_profile_access', { p_profile_id: profileId });
    } catch (e) {
      if (isDev) console.warn('[AUTH] Falha ao registrar acesso', e);
    }
  };

  /**
   * Garante que exista uma sessão válida no Supabase Auth.
   * Isso é fundamental para que as políticas de RLS permitam o acesso aos dados.
   */
  const ensureAuthSession = async (email: string, pass: string) => {
    try {
      const { data: s } = await supabase.auth.getSession();
      
      // Se já houver sessão para o mesmo e-mail, não faz nada
      if (s?.session?.user?.email?.toLowerCase() === email.toLowerCase()) {
        if (isDev) console.log('[AUTH_SYNC] Sessão já ativa para:', email);
        return;
      }

      // Se houver sessão mas de outro usuário, desloga antes
      if (s?.session) {
        await supabase.auth.signOut();
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: pass
      });

      if (error) {
        if (isDev) console.error('[AUTH_SYNC] Falha ao sincronizar sessão Auth:', error);
        if (error.message.includes('Invalid login credentials')) {
          throw new Error("Seu usuário existe no sistema, mas ainda não foi provisionado no Auth. Contate o gestor.");
        }
        throw error;
      }
      
      if (isDev) console.log('[AUTH_SYNC] Sessão Auth criada com sucesso.');
    } catch (e: any) {
      if (isDev) console.error('[AUTH_SYNC_ERROR]', e);
      throw e;
    }
  };

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const saved = localStorage.getItem('cm_saved_profiles');
        if (saved && mounted) {
          try { setSavedProfiles(JSON.parse(saved)); } catch {}
        }
        
        const { data: s } = await supabase.auth.getSession();
        const session = localStorage.getItem('cm_session');
        
        if (session && mounted) {
          try {
            const parsed = JSON.parse(session);
            if (parsed?.profileId) {
                // Sincronização passiva: se o profileId é demo, ignora. 
                // Se for real e não houver Auth session, em prod o ideal seria re-login.
                setActiveProfileId(parsed.profileId);
                trackAccess(parsed.profileId);
            }
          } catch {
            localStorage.removeItem('cm_session');
          }
        }
      } catch (err) {
        if (isDev) console.error('[BOOT] Erro:', err);
      } finally {
        if (mounted) setBootFinished(true);
      }
    };
    boot();
    return () => { mounted = false; };
  }, []);

  const handleLoginSuccess = (profile: any, showToast: any) => {
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
    playNotificationSound();
  };

  const submitLogin = async (
    setIsLoading: (v: boolean) => void,
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    setIsLoading(true);
    try {
      const userInput = (loginUser || '').trim();
      const pass = (loginPassword || '').trim();
      if (!userInput || !pass) throw new Error('Preencha usuário e senha.');

      requestBrowserNotificationPermission();

      // 1. Busca e-mail vinculado se o input for nome de operador
      // ATUALIZADO: Usa RPC para evitar erro de RLS ao buscar usuário anonimamente
      let emailForAuth = userInput;
      if (!userInput.includes('@')) {
          const { data: resolvedEmail, error: resolveErr } = await supabase
            .rpc('resolve_login_email_by_operator', { p_operator: userInput });

          if (resolveErr) throw resolveErr;
          if (resolvedEmail) emailForAuth = String(resolvedEmail);
      }

      // 2. Garante Sessão Auth (Sincronização Crítica para RLS)
      await ensureAuthSession(emailForAuth, pass);

      // 3. Com a sessão ativa, busca o perfil pelo vínculo correto (perfis.user_id = auth.uid())
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;

      if (!uid) throw new Error("Sessão inválida. Faça login novamente.");

      const { data: profile, error: profError } = await supabase
        .from('perfis')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (profError || !profile) {
        throw new Error("Perfil de acesso não localizado no banco de dados (user_id não vinculado).");
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
    setIsLoading: (v: boolean) => void,
    showToast: (msg: string, type?: 'error' | 'success' | 'warning') => void
  ) => {
    setIsLoading(true);
    try {
      const cleanDoc = onlyDigits(params.document);
      const cleanCode = params.code.trim();

      if (!cleanDoc || !cleanCode) throw new Error('Preencha todos os campos.');

      // 1. Busca perfil via RPC (Bypass RLS para Login)
      const { data: loginData, error: loginError } = await supabase
        .rpc('resolve_team_login', {
          p_document: cleanDoc,
          p_pin: cleanCode
        });

      if (loginError) throw loginError;
      if (!loginData) throw new Error('Dados de acesso à equipe incorretos.');

      const profile = loginData;
      const authEmail = loginData.auth_email;

      if (!authEmail) throw new Error('Este perfil não possui e-mail vinculado para autenticação segura.');

      // 2. Garante/Atualiza usuário no Auth via Edge Function
      // O Supabase Auth exige senha mín 6 chars. Se o PIN for menor (ex: 4), completamos com zeros à direita.
      const authPass = cleanCode.length < 6 ? cleanCode.padEnd(6, '0') : cleanCode;

      const { data: fnData, error: fnError } = await supabase.functions.invoke('ensure_auth_user', {
        body: {
          profile_id: profile.id,
          email: authEmail,
          password: authPass
        }
      });

      if (fnError) {
        console.error('Edge Function Error:', fnError);
        throw new Error('Serviço de autenticação indisponível no momento.');
      }

      if (!fnData?.ok) {
        throw new Error(fnData?.error || 'Falha ao sincronizar credenciais de acesso.');
      }

      // 3. Garante Sessão Auth (Fundamental para ultrapassar o bloqueio RLS)
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
        showToast("Sessão de segurança expirada. Digite sua senha.", "warning");
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
  };
};