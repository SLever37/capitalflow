
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
            let profile = null;

            // 1. TENTATIVA RPC (Servidor)
            try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('login_user', {
                    login_input: cleanLogin,
                    password_input: cleanPass
                });

                if (!rpcError && rpcData) {
                    profile = rpcData; 
                }
            } catch (rpcErr) {
                console.warn("RPC fallback.");
            }

            // 2. FALLBACK MANUAL
            if (!profile) {
                const { data: legacyProfiles, error: legacyError } = await supabase
                    .from('perfis')
                    .select('*')
                    .or(`usuario_email.eq.${cleanLogin},nome_operador.eq.${cleanLogin}`);
                
                if (legacyProfiles && legacyProfiles.length > 0) {
                    profile = legacyProfiles.find(p => p.senha_acesso === cleanPass);
                }
            }
        
            if (!profile) {
                // MENSAGEM DE ERRO ESPECÍFICA SOLICITADA
                showToast("E-mail/Usuário ou senha incorretos. Tente novamente.", "error");
                setIsLoading(false);
                return;
            }
        
            // Sucesso
            setActiveProfileId(profile.id);
            
            const newSaved = [
                ...savedProfiles.filter(p => p.id !== profile.id), 
                { id: profile.id, name: profile.nome_operador, email: profile.usuario_email }
            ].slice(0, 5);
            
            setSavedProfiles(newSaved);
            localStorage.setItem('cm_saved_profiles', JSON.stringify(newSaved));
            localStorage.setItem('cm_session', JSON.stringify({ profileId: profile.id, timestamp: Date.now() }));
            
            showToast(`Bem-vindo de volta, ${profile.nome_operador}!`, 'success');

        } catch (err: any) {
            console.error("Erro Crítico de Auth:", err);
            showToast("Falha na comunicação com o servidor.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => { 
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
