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
    sortOption,
    setSortOption,
    searchTerm,
    setSearchTerm,
    clientSearchTerm,
    setClientSearchTerm,
    profileEditForm,
    setProfileEditForm,
    loadError
  } = useAppState(activeProfileId);

  const ui = useUiState() as any;
  ui.sortOption = sortOption;
  ui.setSortOption = setSortOption;

  const { portalLoanId, legalSignToken } = usePortalRouting();
  const isPublicView = !!portalLoanId || !!legalSignToken;

  usePersistedTab(activeTab, setActiveTab);

  const controllers = useControllers(
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

  const { loanCtrl, clientCtrl, sourceCtrl, profileCtrl, adminCtrl, paymentCtrl, fileCtrl, aiCtrl } = controllers;

  useAppNotifications({
      loans, 
      sources, 
      activeUser, 
      showToast, 
      setActiveTab, 
      setSelectedLoanId: ui.setSelectedLoanId,
      disabled: isPublicView
  });

  const exitAttemptRef = useRef(false);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  useEffect(() => {
    if (!activeUser && !portalLoanId && !legalSignToken) return;

    window.history.pushState(null, document.title, window.location.href);

    const handlePopState = () => {
      const currentUi = uiRef.current;
      if (currentUi.activeModal) {
          currentUi.closeModal();
          window.history.pushState(null, '', window.location.href);
          return;
      }
      if (currentUi.showNavHub) {
          currentUi.setShowNavHub(false);
          window.history.pushState(null, '', window.location.href);
          return;
      }
      if (activeTab !== 'DASHBOARD' && !portalLoanId && !legalSignToken) {
        setActiveTab('DASHBOARD');
        window.history.pushState(null, '', window.location.href);
        return;
      }
      if (exitAttemptRef.current) {
      } else {
        showToast('Pressione novamente para sair.', 'info');
        exitAttemptRef.current = true;
        window.history.pushState(null, '', window.location.href);
        setTimeout(() => { exitAttemptRef.current = false; }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeUser === null, !!portalLoanId, !!legalSignToken, activeTab]);

  const shouldRenderGlobalToast = !activeUser || isPublicView;

  return (
    <>
      {shouldRenderGlobalToast && toast && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <div className={`rounded-2xl px-5 py-4 shadow-2xl border text-sm font-bold backdrop-blur-xl max-w-[360px] animate-in slide-in-from-bottom-4 
            ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100' : 
              toast.type === 'error' ? 'bg-rose-500/20 border-rose-400/30 text-rose-100' : 
              toast.type === 'warning' ? 'bg-amber-500/20 border-amber-400/30 text-amber-100' : 
              'bg-slate-500/20 border-slate-400/30 text-slate-100'}`}
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
        loadError={loadError}
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
          onNewLoan={() => { ui.setEditingLoan(null); ui.openModal('LOAN_FORM'); }}
          isStealthMode={ui.isStealthMode}
          toggleStealthMode={() => ui.setIsStealthMode(!ui.isStealthMode)}
        >
          {activeTab === 'DASHBOARD' && (
            <DashboardContainer
              loans={loans} sources={sources} activeUser={activeUser}
              mobileDashboardTab={mobileDashboardTab} setMobileDashboardTab={setMobileDashboardTab}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              ui={ui} loanCtrl={loanCtrl} fileCtrl={fileCtrl} showToast={showToast}
              onRefresh={() => fetchFullData(activeUser?.id || '')}
            />
          )}

          {activeTab === 'CLIENTS' && (
            <ClientsContainer
              clients={clients} clientSearchTerm={clientSearchTerm} setClientSearchTerm={setClientSearchTerm}
              clientCtrl={clientCtrl} loanCtrl={loanCtrl} showToast={showToast} ui={ui}
            />
          )}

          {activeTab === 'SOURCES' && <SourcesContainer sources={sources} ui={ui} sourceCtrl={sourceCtrl} loanCtrl={loanCtrl} />}

          {activeTab === 'PROFILE' && activeUser && (
            <ProfileContainer
              activeUser={activeUser} clients={clients} loans={loans} sources={sources}
              ui={ui} profileCtrl={profileCtrl} handleLogout={handleLogout}
              showToast={showToast} profileEditForm={profileEditForm} setProfileEditForm={setProfileEditForm}
              fileCtrl={fileCtrl}
            />
          )}

          {activeTab === 'LEGAL' && (
            <LegalContainer
              loans={loans} sources={sources} activeUser={activeUser}
              ui={ui} loanCtrl={loanCtrl} fileCtrl={fileCtrl} showToast={showToast}
              onRefresh={() => fetchFullData(activeUser?.id || '')}
            />
          )}

          {activeTab === 'MASTER' && activeUser?.accessLevel === 1 && <MasterContainer allUsers={allUsers} ui={ui} adminCtrl={adminCtrl} />}

          <ModalHostContainer
            ui={ui} activeUser={activeUser} clients={clients} sources={sources} loans={loans}
            isLoadingData={isLoadingData} loanCtrl={loanCtrl} clientCtrl={clientCtrl}
            sourceCtrl={sourceCtrl} paymentCtrl={paymentCtrl} profileCtrl={profileCtrl}
            adminCtrl={adminCtrl} fileCtrl={fileCtrl} aiCtrl={aiCtrl}
            showToast={showToast} fetchFullData={fetchFullData} handleLogout={handleLogout}
          />

          <NavHubController ui={ui} setActiveTab={setActiveTab} activeUser={activeUser} />
        </AppShell>
      </AppGate>
    </>
  );
};