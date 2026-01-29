
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

    const submitLogin = async (
        setIsLoading: (v: boolean) => void, 
        showToast: (msg: string, type?: 'error'|'success'|'warning'|'info') => void
    ) => {
        const cleanLogin = loginUser.trim();
        const cleanPass = loginPassword.trim();
        
        if (!cleanLogin) {
            showToast("Digite seu e-mail ou usuário.", "warning");
            return;
        }

        if (!cleanPass) {
            showToast("Digite sua senha.", "warning");
            return;
        }

        setIsLoading(true);

        try {
            // ETAPA 1: Busca pelo identificador único (E-mail, Usuário ou Documento)
            const { data: profile, error } = await supabase
                .from('perfis')
                .select('id, senha_acesso, nome_operador, usuario_email, email')
                .or(`usuario_email.eq."${cleanLogin}",email.eq."${cleanLogin}",nome_operador.eq."${cleanLogin}"`)
                .maybeSingle();

            if (error) {
                console.error("Supabase Auth Error:", error);
                showToast("Erro de conexão com o banco de dados.", "error");
                return;
            }

            // CASO 1: Identificador não encontrado
            if (!profile) {
                showToast("Usuário ou e-mail não encontrado.", "error");
                return;
            }

            // CASO 2: Usuário encontrado, mas senha não confere
            if (profile.senha_acesso !== cleanPass) {
                showToast("Senha incorreta. Tente novamente.", "error");
                return;
            }

            // CASO 3: Sucesso Total
            setActiveProfileId(profile.id);
            
            const newSaved = [
                ...savedProfiles.filter(p => p.id !== profile.id), 
                { id: profile.id, name: profile.nome_operador, email: profile.usuario_email || profile.email }
            ].slice(0, 5);
            
            setSavedProfiles(newSaved);
            localStorage.setItem('cm_saved_profiles', JSON.stringify(newSaved));
            localStorage.setItem('cm_session', JSON.stringify({ profileId: profile.id, timestamp: Date.now() }));
            
            showToast(`Bem-vindo, ${profile.nome_operador}!`, 'success');

        } catch (err: any) {
            console.error("Critical Auth Crash:", err);
            showToast("Ocorreu um erro inesperado no acesso.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => { 
        setActiveProfileId(null); 
        localStorage.removeItem('cm_session'); 
    };

    const handleSelectSavedProfile = (profile: any, showToast: (msg: string) => void) => {
        setLoginUser(profile.email || profile.name); 
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
