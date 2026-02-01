import React from 'react';
import { Loader2 } from 'lucide-react';
import { ClientPortalView } from '../features/portal/ClientPortalView';
import { PublicLegalSignPage } from '../features/legal/components/PublicLegalSignPage';
import { AuthScreen } from '../features/auth/AuthScreen';
import { UserProfile } from '../types';

interface AppGateProps {
  portalLoanId: string | null;
  activeProfileId: string | null;
  activeUser: UserProfile | null;
  isLoadingData: boolean;
  loadError?: string | null;
  loginUser: string;
  setLoginUser: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  submitLogin: (setLoading: (v: boolean) => void, toast: any) => void;
  savedProfiles: any[];
  handleSelectSavedProfile: (p: any, toast: any) => void;
  handleRemoveSavedProfile: (id: string) => void;
  showToast: any;
  setIsLoadingData: (v: boolean) => void;
  children: React.ReactNode;
  legalSignToken?: string | null;
  toast: { msg: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
}

export const AppGate: React.FC<AppGateProps> = ({
  portalLoanId, activeProfileId, activeUser, isLoadingData, loadError,
  loginUser, setLoginUser, loginPassword, setLoginPassword,
  submitLogin, savedProfiles, handleSelectSavedProfile, handleRemoveSavedProfile,
  showToast, setIsLoadingData, children, legalSignToken, toast
}) => {
  
  const ToastOverlay = () => {
    if (!toast) return null;
    const bg = toast.type === 'error' ? 'bg-rose-600' : toast.type === 'warning' ? 'bg-amber-500 text-black' : 'bg-blue-600';
    return (
      <div className={`fixed z-[999] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 left-4 right-4 top-4 md:left-auto md:right-4 md:w-auto text-white ${bg}`}>
        <span className="font-bold text-sm leading-tight">{toast.msg}</span>
      </div>
    );
  };

  // Vistas Públicas (Portal e Assinatura)
  if (legalSignToken) return <><ToastOverlay/><PublicLegalSignPage token={legalSignToken}/></>;
  if (portalLoanId) return <><ToastOverlay/><ClientPortalView initialLoanId={portalLoanId}/></>;

  // Sessão Detectada mas Dados Carregando
  if (activeProfileId && !activeUser && isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4 animate-in fade-in duration-500">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Sincronizando Capital...</p>
        </div>
      </div>
    );
  }

  // Sem Sessão ou Usuário não Autenticado: Mostra Login Imediatamente
  if (!activeProfileId || !activeUser) {
    return (
      <>
        <ToastOverlay />
        <AuthScreen
          loginUser={loginUser} setLoginUser={setLoginUser}
          loginPassword={loginPassword} setLoginPassword={setLoginPassword}
          submitLogin={() => submitLogin(setIsLoadingData, showToast)}
          isLoading={isLoadingData}
          savedProfiles={savedProfiles || []}
          handleSelectSavedProfile={(p) => handleSelectSavedProfile(p, showToast)}
          handleRemoveSavedProfile={handleRemoveSavedProfile}
          showToast={showToast}
        />
      </>
    );
  }

  // Sessão Ativa: Mostra o Aplicativo
  return <>{children}</>;
};