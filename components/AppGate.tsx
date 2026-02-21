import React from 'react';
import { ClientPortalView } from '../containers/ClientPortal/ClientPortalView';
import { PublicLegalSignPage } from '../features/legal/components/PublicLegalSignPage';
import { PublicLoanLeadPage } from '../pages/PublicLoanLeadPage';
import { CampanhaLanding } from '../pages/Campanha/CampanhaLanding';
import { CampanhaChat } from '../pages/Campanha/CampanhaChat';
import { AuthScreen } from '../features/auth/AuthScreen';

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
}

export const AppGate: React.FC<AppGateProps> = ({
  portalToken,
  legalSignToken,
  activeUser,
  children,
  // Props de Login
  loginUser, setLoginUser, loginPassword, setLoginPassword, submitLogin, submitTeamLogin,
  savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile,
  isLoadingData, setIsLoadingData, showToast, toast, loadError
}) => {
  
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

  // Exibe erro de carregamento se houver
  React.useEffect(() => {
    if (loadError) {
      showToast(loadError, 'error');
    }
  }, [loadError, showToast]);

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

  // 4. Usuário Autenticado: Renderiza o App Shell
  return <>{children}</>;
};