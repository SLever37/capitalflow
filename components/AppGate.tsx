
import React from 'react';
import { Loader2, LogOut, AlertCircle } from 'lucide-react';
import { ClientPortalView } from '../features/portal/ClientPortalView';
import { PublicLegalSignPage } from '../features/legal/components/PublicLegalSignPage';
import { AuthScreen } from '../features/auth/AuthScreen';
import { UserProfile } from '../types';

interface AppGateProps {
  portalLoanId: string | null;
  activeProfileId: string | null;
  activeUser: UserProfile | null;
  isLoadingData: boolean;
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
}

export const AppGate: React.FC<AppGateProps> = ({
  portalLoanId, activeProfileId, activeUser, isLoadingData, loginUser, setLoginUser,
  loginPassword, setLoginPassword, submitLogin, savedProfiles,
  handleSelectSavedProfile, handleRemoveSavedProfile, showToast, setIsLoadingData,
  children, legalSignToken
}) => {
  
  const handleEmergencyLogout = () => {
      localStorage.removeItem('cm_session');
      window.location.reload();
  };

  if (legalSignToken) return <PublicLegalSignPage token={legalSignToken} />;
  if (portalLoanId) return <ClientPortalView initialLoanId={portalLoanId} />;

  if (activeProfileId && !activeUser) {
    const knownName = savedProfiles.find(p => p.id === activeProfileId)?.name || 'Usuário';
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center animate-in zoom-in duration-500 max-w-sm w-full">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-2xl border border-slate-800">
            {isLoadingData ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin"/> : <AlertCircle className="w-8 h-8 text-rose-500"/>}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">
              {isLoadingData ? 'Carregando' : 'Falha ao Carregar'}
          </h2>
          <p className="text-blue-500 font-bold text-lg mb-8">{knownName}...</p>
          <button onClick={handleEmergencyLogout} className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase text-xs">Sair e Tentar Novamente</button>
        </div>
      </div>
    );
  }

  if (!activeProfileId || !activeUser) {
    return (
      <AuthScreen 
        loginUser={loginUser} 
        setLoginUser={setLoginUser} 
        loginPassword={loginPassword} 
        setLoginPassword={setLoginPassword} 
        submitLogin={() => submitLogin(setIsLoadingData, showToast)} 
        isLoading={isLoadingData} 
        savedProfiles={savedProfiles} 
        handleSelectSavedProfile={(p) => handleSelectSavedProfile(p, showToast)} 
        handleRemoveSavedProfile={handleRemoveSavedProfile} 
        showToast={showToast} 
      />
    );
  }

  return <>{children}</>;
};
