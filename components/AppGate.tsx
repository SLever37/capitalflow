import React from 'react';
import { ClientPortalView } from '../containers/ClientPortal/ClientPortalView';
import { PublicLegalSignPage } from '../features/legal/components/PublicLegalSignPage';
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
  loginUser, setLoginUser, loginPassword, setLoginPassword, submitLogin,
  savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile,
  isLoadingData, setIsLoadingData, showToast, toast
}) => {
  
  // 1. Rota Pública: Portal Financeiro (Acesso via Token)
  if (portalToken) {
    return <ClientPortalView initialPortalToken={portalToken} />;
  }

  // 2. Rota Pública: Assinatura Jurídica
  if (legalSignToken) {
     return <PublicLegalSignPage token={legalSignToken} />;
  }

  // 3. Rota Privada: Sistema (Requer Login)
  if (!activeUser) {
    return (
      <AuthScreen
        loginUser={loginUser}
        setLoginUser={setLoginUser}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        submitLogin={() => submitLogin(setIsLoadingData, showToast)}
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