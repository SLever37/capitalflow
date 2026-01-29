
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export const useAuth = () => {
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [loginUser, setLoginUser] = useState(''); 
    const [loginPassword, setLoginPassword] = useState('');
    const [savedProfiles, setSavedProfiles] = useState<{id: string, name: string, email: string}[]>([]);
    
    useEffect(() => {
        const saved = localStorage.getItem('cm_saved_profiles');
        if (saved) {
          try { setSavedProfiles(JSON.parse(saved)); } catch (e) {}
        }
    
        const session = localStorage.getItem('cm_session');
        if (session) {
          try {
            const { profileId } = JSON.parse(session);
            if (profileId) setActiveProfileId(profileId);
          } catch (e) { localStorage.removeItem('cm_session'); }
        }
    }, []);

    const submitLogin = async (setIsLoading: (v: boolean) => void, showToast: (msg: string, type?: 'error'|'success'|'warning') => void) => {
        setIsLoading(true);
        const cleanLogin = loginUser.trim();
        const cleanPass = loginPassword.trim();
        
        if (!cleanLogin) {
            showToast("Digite seu e-mail ou usuário.", "warning");
            setIsLoading(false);
            return;
        }

        if (!cleanPass) {
            showToast("Digite sua senha.", "warning");
            setIsLoading(false);
            return;
        }

        try {
            // TENTATIVA: Login via Tabela Customizada 'perfis'
            // Verifica: usuario_email OU email OU nome_operador E senha_acesso
            const { data: profile, error } = await supabase
                .from('perfis')
                .select('*')
                .or(`usuario_email.eq.${cleanLogin},email.eq.${cleanLogin},nome_operador.eq.${cleanLogin}`)
                .eq('senha_acesso', cleanPass)
                .single();

            if (error) {
                console.error("Erro Auth DB:", error);
                
                // Código PGRST116 significa que a query não retornou linhas (usuário não encontrado ou senha errada)
                if (error.code === 'PGRST116') {
                    showToast("Credenciais inválidas. Verifique usuário e senha.", "error");
                } else if (error.message && error.message.includes("Failed to fetch")) {
                    showToast("Erro de conexão. Verifique sua internet.", "error");
                } else {
                    showToast("Erro ao autenticar: " + error.message, "error");
                }
                setIsLoading(false);
                return;
            }

            if (profile) {
                setActiveProfileId(profile.id);
                
                const newSaved = [
                    ...savedProfiles.filter(p => p.id !== profile.id), 
                    { id: profile.id, name: profile.nome_operador, email: profile.usuario_email || profile.email }
                ].slice(0, 5);
                
                setSavedProfiles(newSaved);
                localStorage.setItem('cm_saved_profiles', JSON.stringify(newSaved));
                localStorage.setItem('cm_session', JSON.stringify({ profileId: profile.id, timestamp: Date.now() }));
                
                showToast(`Bem-vindo de volta, ${profile.nome_operador}!`, 'success');
            } else {
                showToast("Usuário não encontrado.", "error");
            }

        } catch (err: any) {
            console.error("Erro Crítico de Auth:", err);
            if (err.message && err.message.includes("Failed to fetch")) {
                showToast("Falha na conexão com o servidor.", "error");
            } else {
                showToast("Erro inesperado no login.", "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => { 
        // Apenas limpa estado local, já que não usamos sessão do Supabase Auth
        setActiveProfileId(null); 
        localStorage.removeItem('cm_session'); 
    };

    const handleSelectSavedProfile = (profile: any, showToast: (msg: string) => void) => {
        setLoginUser(profile.email || profile.name); // Fallback para name se email faltar no saved
        setLoginPassword('');
        showToast(`Olá, ${profile.name}. Digite sua senha.`);
        const passField = document.getElementById('login-password');
        if (passField) passField.focus();
    };
    
    const handleRemoveSavedProfile = (id: string) => {
        const updated = savedProfiles.filter(p => p.id !== id);
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
        setSavedProfiles,
        submitLogin,
        handleLogout,
        handleSelectSavedProfile,
        handleRemoveSavedProfile
    };
};
