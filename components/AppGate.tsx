
import React from 'react';
import { Loader2, AlertCircle, AlertTriangle, CheckCircle2, Shield, RotateCcw } from 'lucide-react';
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
  portalLoanId,
  activeProfileId,
  activeUser,
  isLoadingData,
  loadError,
  loginUser,
  setLoginUser,
  loginPassword,
  setLoginPassword,
  submitLogin,
  savedProfiles,
  handleSelectSavedProfile,
  handleRemoveSavedProfile,
  showToast,
  setIsLoadingData,
  children,
  legalSignToken,
  toast
}) => {
  const handleEmergencyLogout = () => {
    localStorage.removeItem('cm_session');
    window.location.reload();
  };

  const handleRetry = () => {
      window.location.reload();
  };

  const ToastOverlay = () => {
    if (!toast) return null;

    const bg =
      toast.type === 'error'
        ? 'bg-rose-600 text-white'
        : toast.type === 'warning'
        ? 'bg-amber-500 text-black'
        : toast.type === 'info'
        ? 'bg-blue-600 text-white'
        : 'bg-emerald-600 text-white';

    const Icon =
      toast.type === 'error'
        ? AlertCircle
        : toast.type === 'warning'
        ? AlertTriangle
        : CheckCircle2;

    return (
      <div
        className={`fixed z-[999] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 left-4 right-4 top-4 md:left-auto md:right-4 md:w-auto ${bg}`}
      >
        <Icon size={24} />
        <span className="font-bold text-sm leading-tight">{toast.msg}</span>
      </div>
    );
  };

  if (legalSignToken) {
    return (
      <>
        <ToastOverlay />
        <PublicLegalSignPage token={legalSignToken} />
      </>
    );
  }

  if (portalLoanId) {
    return (
      <>
        <ToastOverlay />
        <ClientPortalView initialLoanId={portalLoanId} />
      </>
    );
  }

  // TELA DE TRANSIÇÃO ROBUSTA (EVITA TELA BRANCA)
  if (activeProfileId && !activeUser) {
    const knownProfile = savedProfiles?.find((p) => p.id === activeProfileId);
    const knownName = knownProfile?.name || 'Usuário';
    
    return (
      <>
        <ToastOverlay />
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm w-full space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="relative mx-auto w-24 h-24">
                <div className={`absolute inset-0 blur-2xl rounded-full animate-pulse ${loadError ? 'bg-rose-600/20' : 'bg-blue-600/20'}`}></div>
                <div className="relative w-full h-full bg-slate-900 rounded-[2rem] border border-slate-800 flex items-center justify-center shadow-2xl">
                   {isLoadingData && !loadError ? (
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                   ) : loadError ? (
                        <AlertTriangle className="w-10 h-10 text-rose-500" />
                   ) : (
                        <Shield className="w-10 h-10 text-slate-700" />
                   )}
                </div>
            </div>
            
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                    {loadError ? 'Erro de Conexão' : isLoadingData ? 'Sincronizando' : 'Sessão Expirada'}
                </h2>
                <p className="text-blue-500 font-bold text-lg">Olá, {knownName}</p>
                
                {loadError ? (
                    <p className="text-rose-400/80 text-xs mt-4 leading-relaxed bg-rose-950/30 p-3 rounded-xl border border-rose-500/20">
                        {loadError}
                    </p>
                ) : (
                    <p className="text-slate-500 text-xs mt-4 leading-relaxed">
                        {isLoadingData 
                            ? 'Buscando seus contratos e fluxos de caixa na nuvem...' 
                            : 'Não conseguimos validar seu acesso automaticamente.'}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleRetry}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                >
                    <RotateCcw size={14}/> Tentar Novamente
                </button>
                
                <button
                    onClick={handleEmergencyLogout}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                >
                    Voltar para o Login
                </button>
            </div>
            
            {isLoadingData && !loadError && (
                 <div className="pt-4 flex justify-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
                 </div>
            )}
          </div>
        </div>
      </>
    );
  }

  if (!activeProfileId || !activeUser) {
    return (
      <>
        <ToastOverlay />
        <AuthScreen
          loginUser={loginUser}
          setLoginUser={setLoginUser}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
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

  return (
    <>
      <ToastOverlay />
      {children}
    </>
  );
};
