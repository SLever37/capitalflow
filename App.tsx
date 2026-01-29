import React, { useEffect, useRef } from 'react';

import { AppShell } from './layout/AppShell';
import { NavHubController } from './layout/NavHubController';
import { AppGate } from './components/AppGate';

import { useAuth } from './features/auth/useAuth';
import { useToast } from './hooks/useToast';
import { useAppState } from './hooks/useAppState';
import { useUiState } from './hooks/useUiState';
import { usePortalRouting } from './hooks/usePortalRouting';
import { usePersistedTab } from './hooks/usePersistedTab';
import { useControllers } from './hooks/useControllers';
import { useAppNotifications } from './hooks/useAppNotifications';

import { DashboardContainer } from './containers/DashboardContainer';
import { ClientsContainer } from './containers/ClientsContainer';
import { SourcesContainer } from './containers/SourcesContainer';
import { ProfileContainer } from './containers/ProfileContainer';
import { MasterContainer } from './containers/MasterContainer';
import { LegalContainer } from './containers/LegalContainer';
import { ModalHostContainer } from './containers/ModalHostContainer';

export const App: React.FC = () => {
  const {
    activeProfileId,
    loginUser,
    setLoginUser,
    loginPassword,
    setLoginPassword,
    savedProfiles,
    submitLogin,
    handleLogout,
    handleSelectSavedProfile,
    handleRemoveSavedProfile,
  } = useAuth();

  const { toast, showToast } = useToast();

  const {
    loans,
    setLoans,
    clients,
    setClients,
    sources,
    setSources,
    activeUser,
    setActiveUser,
    allUsers,
    isLoadingData,
    setIsLoadingData,
    fetchFullData,
    fetchAllUsers,
    activeTab,
    setActiveTab,
    mobileDashboardTab,
    setMobileDashboardTab,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    clientSearchTerm,
    setClientSearchTerm,
    profileEditForm,
    setProfileEditForm,
  } = useAppState(activeProfileId);

  const ui = useUiState();
  const { portalLoanId, legalSignToken } = usePortalRouting();
  usePersistedTab(activeTab, setActiveTab);

  const { loanCtrl, clientCtrl, sourceCtrl, profileCtrl, adminCtrl, paymentCtrl, fileCtrl, aiCtrl } =
    useControllers(
      activeUser,
      ui,
      loans,
      setLoans,
      clients,
      setClients,
      sources,
      setSources,
      setActiveUser,
      setIsLoadingData,
      fetchFullData,
      fetchAllUsers,
      handleLogout,
      showToast,
      profileEditForm,
      setProfileEditForm
    );

  // --- SISTEMA DE NOTIFICAÇÕES INTELIGENTES (Contratos + Recursos) ---
  useAppNotifications(loans, sources, activeUser, showToast);

  // --- MECANISMO ANTISSAÍDA ACIDENTAL ---
  const exitAttemptRef = useRef(false);

  useEffect(() => {
    window.history.pushState(null, document.title, window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      const closeIfOpen = (isOpen: boolean, closeFn: () => void) => {
        if (isOpen) {
          closeFn();
          window.history.pushState(null, '', window.location.href);
          return true;
        }
        return false;
      };

      if (closeIfOpen(!!ui.activeModal, () => ui.closeModal())) return;
      if (closeIfOpen(ui.showNavHub, () => ui.setShowNavHub(false))) return;

      if (activeTab !== 'DASHBOARD') {
        setActiveTab('DASHBOARD');
        window.history.pushState(null, '', window.location.href);
        return;
      }

      if (exitAttemptRef.current) {
        // deixa sair
      } else {
        showToast('Pressione voltar novamente para sair.', 'info');
        exitAttemptRef.current = true;
        window.history.pushState(null, '', window.location.href);

        setTimeout(() => {
          exitAttemptRef.current = false;
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, ui, showToast, setActiveTab]);

  // ✅ Toast global para telas que NÃO usam AppShell (Login / Portal público / Assinatura pública)
  const shouldRenderGlobalToast = !activeUser || !!portalLoanId || !!legalSignToken;

  return (
    <>
      {shouldRenderGlobalToast && toast && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <div
            className={[
              'rounded-2xl px-5 py-4 shadow-2xl border text-sm font-bold backdrop-blur-xl max-w-[360px]',
              toast?.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100'
                : toast?.type === 'error'
                ? 'bg-rose-500/20 border-rose-400/30 text-rose-100'
                : toast?.type === 'warning'
                ? 'bg-amber-500/20 border-amber-400/30 text-amber-100'
                : 'bg-slate-500/20 border-slate-400/30 text-slate-100',
            ].join(' ')}
          >
            {toast.msg}
          </div>
        </div>
      )}

      <AppGate
        portalLoanId={portalLoanId}
        legalSignToken={legalSignToken}
        activeProfileId={activeProfileId}
        activeUser={activeUser}
        isLoadingData={isLoadingData}
        loginUser={loginUser}
        setLoginUser={setLoginUser}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        submitLogin={submitLogin}
        savedProfiles={savedProfiles}
        handleSelectSavedProfile={handleSelectSavedProfile}
        handleRemoveSavedProfile={handleRemoveSavedProfile}
        showToast={showToast}
        setIsLoadingData={setIsLoadingData}
        toast={toast}
      >
        <AppShell
          toast={toast}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeUser={activeUser}
          isLoadingData={isLoadingData}
          onOpenNav={() => ui.setShowNavHub(true)}
          onNewLoan={() => {
            ui.setEditingLoan(null);
            ui.openModal('LOAN_FORM');
          }}
          isStealthMode={ui.isStealthMode}
          toggleStealthMode={() => ui.setIsStealthMode(!ui.isStealthMode)}
          onOpenAssistant={() => ui.openModal('AI_ASSISTANT')}
        >
          {activeTab === 'DASHBOARD' && (
            <DashboardContainer
              loans={loans}
              sources={sources}
              activeUser={activeUser}
              mobileDashboardTab={mobileDashboardTab}
              setMobileDashboardTab={setMobileDashboardTab}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              ui={ui}
              loanCtrl={loanCtrl}
              fileCtrl={fileCtrl}
              showToast={showToast}
              onRefresh={() => fetchFullData(activeUser?.id || '')}
            />
          )}

          {activeTab === 'CLIENTS' && (
            <ClientsContainer
              clients={clients}
              clientSearchTerm={clientSearchTerm}
              setClientSearchTerm={setClientSearchTerm}
              clientCtrl={clientCtrl}
              loanCtrl={loanCtrl}
              showToast={showToast}
              ui={ui}
            />
          )}

          {activeTab === 'SOURCES' && <SourcesContainer sources={sources} ui={ui} sourceCtrl={sourceCtrl} loanCtrl={loanCtrl} />}

          {activeTab === 'PROFILE' && activeUser && (
            <ProfileContainer
              activeUser={activeUser}
              clients={clients}
              loans={loans}
              sources={sources}
              ui={ui}
              profileCtrl={profileCtrl}
              handleLogout={handleLogout}
              showToast={showToast}
              profileEditForm={profileEditForm}
              setProfileEditForm={setProfileEditForm}
              fileCtrl={fileCtrl}
            />
          )}

          {activeTab === 'LEGAL' && (
            <LegalContainer
              loans={loans}
              sources={sources}
              activeUser={activeUser}
              ui={ui}
              loanCtrl={loanCtrl}
              fileCtrl={fileCtrl}
              showToast={showToast}
              onRefresh={() => fetchFullData(activeUser?.id || '')}
            />
          )}

          {activeTab === 'MASTER' && activeUser?.accessLevel === 1 && <MasterContainer allUsers={allUsers} ui={ui} adminCtrl={adminCtrl} />}

          <ModalHostContainer
            ui={ui}
            activeUser={activeUser}
            clients={clients}
            sources={sources}
            loans={loans}
            isLoadingData={isLoadingData}
            loanCtrl={loanCtrl}
            clientCtrl={clientCtrl}
            sourceCtrl={sourceCtrl}
            paymentCtrl={paymentCtrl}
            profileCtrl={profileCtrl}
            adminCtrl={adminCtrl}
            fileCtrl={fileCtrl}
            aiCtrl={aiCtrl}
            showToast={showToast}
            fetchFullData={fetchFullData}
            handleLogout={handleLogout}
          />

          <NavHubController ui={ui} setActiveTab={setActiveTab} activeUser={activeUser} />
        </AppShell>
      </AppGate>
    </>
  );
};