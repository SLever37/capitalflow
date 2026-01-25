
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
        
        if (!cleanLogin) {
            showToast("Por favor, digite seu e-mail ou usuário.", "warning");
            setIsLoading(false);
            return;
        }

        if (!loginPassword) {
            showToast("Por favor, digite sua senha.", "warning");
            setIsLoading(false);
            return;
        }

        try {
            let profile = null;

            // 1. TENTATIVA SEGURA (RPC - Server Side)
            // Tenta usar a função de banco de dados segura.
            const { data: rpcData, error: rpcError } = await supabase.rpc('login_user', {
                login_input: cleanLogin,
                password_input: loginPassword
            });

            if (!rpcError) {
                // Se a RPC funcionou (mesmo que retorne null se senha errada), usamos o resultado.
                profile = rpcData; 
            } else {
                // 2. FALLBACK LEGADO (Se a RPC não existir ou der erro de configuração)
                // Isso garante que o app não pare de funcionar se o SQL não tiver sido rodado.
                console.warn("Login via RPC falhou ou não configurado. Tentando método legado...", rpcError.message);
                
                const { data: legacyProfiles, error: legacyError } = await supabase
                    .from('perfis')
                    .select('*')
                    .or(`usuario_email.ilike.${cleanLogin},nome_operador.ilike.${cleanLogin}`);
                
                if (!legacyError && legacyProfiles) {
                    // Validação client-side (temporária/fallback) - Funciona como antes da atualização
                    profile = legacyProfiles.find(p => p.senha_acesso === loginPassword);
                }
            }
        
            if (!profile) {
                showToast("Usuário ou senha incorretos.", "error");
                setIsLoading(false);
                return;
            }
        
            // Login Sucesso
            setActiveProfileId(profile.id);
            
            // Atualiza lista de salvos
            const newSaved = [
                ...savedProfiles.filter(p => p.id !== profile.id), 
                { id: profile.id, name: profile.nome_operador, email: profile.usuario_email }
            ];
            setSavedProfiles(newSaved);
            localStorage.setItem('cm_saved_profiles', JSON.stringify(newSaved));
            localStorage.setItem('cm_session', JSON.stringify({ profileId: profile.id, timestamp: Date.now() }));
            
            showToast(`Bem-vindo de volta, ${profile.nome_operador}!`, 'success');

        } catch (err: any) {
            console.error(err);
            showToast("Falha na conexão.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => { 
        setActiveProfileId(null); 
        localStorage.removeItem('cm_session'); 
    };

    const handleSelectSavedProfile = (profile: any, showToast: (msg: string) => void) => {
        setLoginUser(profile.email);
        setLoginPassword('');
        showToast(`Olá, ${profile.name}. Confirme sua senha.`);
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
