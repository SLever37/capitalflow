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

            // 1. TENTATIVA RPC (Servidor - Se existir a função)
            try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('login_user', {
                    login_input: cleanLogin,
                    password_input: cleanPass
                });

                if (!rpcError && rpcData) {
                    profile = rpcData; 
                }
            } catch (rpcErr) {
                console.warn("RPC login_user não disponível ou falhou, tentando busca manual.");
            }

            // 2. FALLBACK MANUAL (Busca por e-mail ou nome)
            if (!profile) {
                // CORREÇÃO: Sintaxe PostgREST para .or() não deve ter aspas duplas em volta dos valores a menos que contenham caracteres especiais reservados.
                // Para emails comuns e nomes, o valor puro é o correto.
                const { data: legacyProfiles, error: legacyError } = await supabase
                    .from('perfis')
                    .select('*')
                    .or(`usuario_email.eq.${cleanLogin},nome_operador.eq.${cleanLogin}`);
                
                if (legacyError) {
                    console.error("Erro na busca manual:", legacyError);
                }

                if (legacyProfiles && legacyProfiles.length > 0) {
                    // Verifica senha localmente para o fallback
                    profile = legacyProfiles.find(p => p.senha_acesso === cleanPass);
                }
            }
        
            if (!profile) {
                showToast("Acesso negado. Verifique e-mail e senha.", "error");
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
            
            showToast(`Olá, ${profile.nome_operador}!`, 'success');

        } catch (err: any) {
            console.error("Erro Crítico de Auth:", err);
            showToast("Erro na conexão com o servidor.", "error");
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