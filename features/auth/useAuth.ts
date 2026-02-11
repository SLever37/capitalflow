
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

  const handleLoginSuccess = (profile: any, showToast: any) => {
      playNotificationSound();
      
      const profileId = profile.id;
      const profileName = resolveSmartName(profile); 
      const profileEmail = asString(profile.usuario_email || profile.email || 'equipe@sistema');

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
  };

  // Login Padrão (Gestor)
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

      // 1. Tenta via RPC (E-mail sempre em minúsculas para matching de login)
      try {
        const { data, error: rpcError } = await supabase.rpc('login_user', {
            p_email: userInput.toLowerCase(),
            p_password: pass,
        });

        if (!rpcError && data) {
            profile = Array.isArray(data) ? data[0] : data;
        }
      } catch (e) {
        console.warn("RPC Login failed, falling back.", e);
      }

      // 2. Fallback Manual Seguro
      if (!profile) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('perfis')
          .select('*')
          .or(`usuario_email.ilike."${userInput}",nome_operador.ilike."${userInput}"`)
          .eq('senha_acesso', pass)
          .maybeSingle();
        
        if (!fallbackError && fallbackData) {
            profile = fallbackData;
        }
      }

      if (!profile) {
        showToast('Usuário ou senha inválidos.', 'error');
        setIsLoading(false);
        return;
      }

// 🔐 Define profile_id na sessão do Postgres para RLS funcionar
await supabase.rpc('set_session_profile_id', {
  p_profile_id: profile.id,
});

      handleLoginSuccess(profile, showToast);
    } catch (err: any) {
      console.error("Erro crítico no login:", err);
      showToast('Erro de conexão: ' + (err.message || 'Desconhecido'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Login de Equipe (Sem Senha, com Validação de Dados)
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
              showToast("Preencha todos os campos para entrar.", "warning");
              setIsLoading(false);
              return;
          }

          // Busca perfil que combine CPF, Codigo de Acesso e Telefone (parcial ou total)
          // Nota: Phone match exato ou contains pode variar dependendo de como salvou (55 ou nao).
          // Vamos tentar match exato no Access Code e Documento primeiro.
          const { data: profiles, error } = await supabase
              .from('perfis')
              .select('*')
              .eq('document', cleanDoc)
              .eq('access_code', cleanCode);

          if (error) throw error;

          // Validação de Telefone em memória (para ser mais flexível com o DDD/55)
          const validProfile = profiles?.find(p => {
              const dbPhone = onlyDigits(p.phone || '');
              return dbPhone.includes(cleanPhone) || cleanPhone.includes(dbPhone);
          });

          if (!validProfile) {
              showToast("Dados incorretos. Verifique CPF, Telefone e Código.", "error");
              return;
          }

          handleLoginSuccess(validProfile, showToast);

      } catch (e: any) {
          console.error(e);
          showToast("Erro ao entrar: " + e.message, "error");
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
    submitTeamLogin, // Exportado
    handleLogout,
    handleSelectSavedProfile,
    handleRemoveSavedProfile,
  };
};
