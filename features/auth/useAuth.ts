
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { requestBrowserNotificationPermission } from '../../utils/notifications';
import { asString } from '../../utils/safe';
import { playNotificationSound } from '../../utils/notificationSound';
import { generateUUID } from '../../utils/generators';

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
      } catch { localStorage.removeItem('cm_session'); }
    }
  }, []);

  const handleLoginSuccess = (profile: any, showToast: any) => {
      playNotificationSound();
      const profileId = profile.id;
      const profileName = resolveSmartName(profile); 
      const profileEmail = asString(profile.usuario_email || profile.email || 'equipe@sistema');

      setActiveProfileId(profileId);
      const updatedSaved = [
        ...savedProfiles.filter((p) => p.id !== profileId),
        { id: profileId, name: profileName, email: profileEmail },
      ].slice(0, 5);

      setSavedProfiles(updatedSaved);
      localStorage.setItem('cm_saved_profiles', JSON.stringify(updatedSaved));
      localStorage.setItem('cm_session', JSON.stringify({ profileId: profileId, ts: Date.now() }));
      showToast(`Bem-vindo, ${profileName}!`, 'success');
  };

  const submitRegister = async (form: any, setIsLoading: (v: boolean) => void, showToast: any) => {
      setIsLoading(true);
      try {
          if (!form.name || !form.email || !form.password) {
              showToast("Preencha todos os campos obrigatórios.", "warning");
              return;
          }

          // Verifica se e-mail já existe
          const { data: existing } = await supabase.from('perfis').select('id').eq('usuario_email', form.email.toLowerCase().trim()).maybeSingle();
          if (existing) {
              showToast("Este e-mail já está cadastrado.", "error");
              return;
          }

          const profileId = generateUUID();
          const { data, error } = await supabase.from('perfis').insert({
              id: profileId,
              nome_operador: form.name,
              nome_completo: form.name,
              usuario_email: form.email.toLowerCase().trim(),
              email: form.email.toLowerCase().trim(),
              nome_empresa: form.businessName || 'Meu Negócio',
              senha_acesso: form.password,
              recovery_phrase: form.recoveryPhrase || 'CAPITALFLOW',
              access_level: 1, // Sempre Master ao criar conta via tela inicial
              interest_balance: 0,
              total_available_capital: 0,
              created_at: new Date().toISOString()
          }).select().single();

          if (error) throw error;
          handleLoginSuccess(data, showToast);
      } catch (e: any) {
          showToast("Erro ao criar conta: " + e.message, "error");
      } finally {
          setIsLoading(false);
      }
  };

  const submitLogin = async (setIsLoading: (v: boolean) => void, showToast: any) => {
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
      const { data: profile, error } = await supabase
        .from('perfis')
        .select('*')
        .or(`usuario_email.ilike."${userInput}",nome_operador.ilike."${userInput}"`)
        .eq('senha_acesso', pass)
        .maybeSingle();

      if (error || !profile) {
        showToast('Usuário ou senha inválidos.', 'error');
        setIsLoading(false);
        return;
      }
      handleLoginSuccess(profile, showToast);
    } catch (err: any) {
      showToast('Erro de conexão: ' + err.message, 'error');
    } finally { setIsLoading(false); }
  };

  const handleLogout = () => {
    setActiveProfileId(null);
    localStorage.removeItem('cm_session');
  };

  return {
    activeProfileId, loginUser, setLoginUser, loginPassword, setLoginPassword,
    savedProfiles, submitLogin, submitRegister, handleLogout,
    handleSelectSavedProfile: (p: any, toast: any) => { setLoginUser(p.email); toast(`Olá ${p.name}, digite sua senha.`); },
    handleRemoveSavedProfile: (id: string) => {
        const updated = savedProfiles.filter(p => p.id !== id);
        setSavedProfiles(updated);
        localStorage.setItem('cm_saved_profiles', JSON.stringify(updated));
    }
  };
};
