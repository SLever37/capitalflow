import React, { useState } from 'react';
import { ClientPortalView } from '../containers/ClientPortal/ClientPortalView';
import { PublicLegalSignPage } from '../features/legal/components/PublicLegalSignPage';
import { PublicLoanLeadPage } from '../pages/PublicLoanLeadPage';
import { CampanhaLanding } from '../pages/Campanha/CampanhaLanding';
import { CampanhaChat } from '../pages/Campanha/CampanhaChat';
import { AuthScreen } from '../features/auth/AuthScreen';
import { Lock, Loader2 } from 'lucide-react';

interface AppGateProps {
  portalToken?: string | null;
  legalSignToken?: string | null;
  activeProfileId: string | null;
  activeUser: any | null;
  isLoadingData: boolean;
  loadError: string | null;
  loginUser: string;
  setLoginUser: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  submitLogin: (setLoading: any, setToast: any) => void;
  submitTeamLogin: (params: any, showToast: any) => Promise<void>;
  savedProfiles: any[];
  handleSelectSavedProfile: (p: any, toast: any) => void;
  handleRemoveSavedProfile: (id: string) => void;
  showToast: (msg: string, type?: any) => void;
  setIsLoadingData: (v: boolean) => void;
  toast: any;
  children: React.ReactNode;
  reauthenticate: (pass: string) => Promise<void>;
  onReauthSuccess: () => void;
}

export const AppGate: React.FC<AppGateProps> = ({
  portalToken,
  legalSignToken,
  activeUser,
  children,
  // Props de Login
  loginUser, setLoginUser, loginPassword, setLoginPassword, submitLogin, submitTeamLogin,
  savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile,
  isLoadingData, setIsLoadingData, showToast, toast, loadError,
  reauthenticate, onReauthSuccess
}) => {
  const [reauthPass, setReauthPass] = useState('');
  const [isReauthing, setIsReauthing] = useState(false);
  
  // 0. Rota Pública: Lead de Empréstimo
  const params = new URLSearchParams(window.location.search);
  if (params.get('public') === 'emprestimo') {
    return <PublicLoanLeadPage />;
  }

  // 0.1 Rota Pública: Landing Page de Campanha
  const campaignId = params.get('campaign_id');
  const path = window.location.pathname;

  // Suporte a /campanha/chat
  if (path === '/campanha/chat') {
    return <CampanhaChat />;
  }

  // Suporte a /campanha?campaign_id=... ou /?campaign_id=...
  if (path === '/campanha' || campaignId) {
    // Se não tiver ID, mostra erro ou redireciona
    if (!campaignId) {
       return (
         <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm font-bold uppercase">
           Campanha não especificada.
         </div>
       );
    }
    return <CampanhaLanding campaignId={campaignId} />;
  }

  // 1. Rota Pública: Portal Financeiro (Acesso via Token)
  if (portalToken) {
    return <ClientPortalView initialPortalToken={portalToken} />;
  }

  // 2. Rota Pública: Assinatura Jurídica
  if (legalSignToken) {
     return <PublicLegalSignPage token={legalSignToken} />;
  }

  // Exibe erro de carregamento se houver (exceto se for sessão expirada, que mostra modal)
  React.useEffect(() => {
    if (loadError && loadError !== 'SESSAO_EXPIRADA') {
      showToast(loadError, 'error');
    }
  }, [loadError, showToast]);

  const handleReauthSubmit = async () => {
    if (!reauthPass) return;
    setIsReauthing(true);
    try {
        await reauthenticate(reauthPass);
        setReauthPass('');
        onReauthSuccess();
    } catch (e: any) {
        showToast(e.message || 'Senha incorreta.', 'error');
    } finally {
        setIsReauthing(false);
    }
  };

  // 3. Rota Privada: Sistema (Requer Login)
  if (!activeUser) {
    return (
      <AuthScreen
        loginUser={loginUser}
        setLoginUser={setLoginUser}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        submitLogin={() => submitLogin(setIsLoadingData, showToast)}
        submitTeamLogin={submitTeamLogin}
        savedProfiles={savedProfiles}
        handleSelectSavedProfile={(p) => handleSelectSavedProfile(p, showToast)}
        handleRemoveSavedProfile={handleRemoveSavedProfile}
        isLoading={isLoadingData}
        showToast={showToast}
        toast={toast}
      />
    );
  }

  // 4. Usuário Autenticado: Renderiza o App Shell + Modal de Reauth se necessário
  return (
    <>
      {children}
      
      {loadError === 'SESSAO_EXPIRADA' && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full pointer-events-none"></div>
              
              <div className="relative z-10 text-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-inner">
                    <Lock className="text-blue-500" size={32} />
                  </div>
                  
                  <h2 className="text-white font-black text-xl uppercase tracking-tight mb-2">Sessão Expirada</h2>
                  <p className="text-slate-400 text-xs font-medium mb-6 leading-relaxed">
                    Por segurança, confirme sua senha para continuar acessando o sistema.
                  </p>
                  
                  <div className="space-y-3">
                      <input 
                        type="password" 
                        value={reauthPass}
                        onChange={e => setReauthPass(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleReauthSubmit()}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-blue-500 transition-colors text-center tracking-widest"
                        placeholder="Sua senha"
                        autoFocus
                      />
                      
                      <button 
                        onClick={handleReauthSubmit}
                        disabled={isReauthing || !reauthPass}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isReauthing ? <Loader2 className="animate-spin" size={16}/> : 'Confirmar Acesso'}
                      </button>
                  </div>
              </div>
           </div>
        </div>
      )}
    </>
  );
};