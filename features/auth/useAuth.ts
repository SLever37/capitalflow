
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
            showToast("Digite seu e-mail.", "warning");
            setIsLoading(false);
            return;
        }

        if (!cleanPass) {
            showToast("Digite sua senha.", "warning");
            setIsLoading(false);
            return;
        }

        try {
            // TENTATIVA: Login via Supabase Auth (Seguro)
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: cleanLogin,
                password: cleanPass
            });

            if (authError) {
                console.error("Erro Auth:", authError.message);
                if (authError.message.includes("Invalid login credentials")) {
                    showToast("Credenciais inválidas. Verifique e-mail e senha.", "error");
                } else {
                    showToast("Erro ao autenticar: " + authError.message, "error");
                }
                setIsLoading(false);
                return;
            }

            if (authData.user) {
                // Sucesso no Auth, busca perfil vinculado
                const { data: profile, error: profileError } = await supabase
                    .from('perfis')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();

                if (profile) {
                    setActiveProfileId(profile.id);
                    
                    const newSaved = [
                        ...savedProfiles.filter(p => p.id !== profile.id), 
                        { id: profile.id, name: profile.nome_operador, email: profile.usuario_email }
                    ].slice(0, 5);
                    
                    setSavedProfiles(newSaved);
                    localStorage.setItem('cm_saved_profiles', JSON.stringify(newSaved));
                    localStorage.setItem('cm_session', JSON.stringify({ profileId: profile.id, timestamp: Date.now() }));
                    
                    showToast(`Bem-vindo de volta, ${profile.nome_operador}!`, 'success');
                } else {
                    showToast("Perfil não encontrado. Contate o suporte.", "error");
                }
            }

        } catch (err: any) {
            console.error("Erro Crítico de Auth:", err);
            showToast("Falha na comunicação com o servidor.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => { 
        await supabase.auth.signOut();
        setActiveProfileId(null); 
        localStorage.removeItem('cm_session'); 
    };

    const handleSelectSavedProfile = (profile: any, showToast: (msg: string) => void) => {
        setLoginUser(profile.email || profile.nome_operador);
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
