
import React, { useEffect } from 'react';
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
import { LegalContainer } from './containers/LegalContainer';
import { ModalHostContainer } from './containers/ModalHostContainer';
import { OperatorSupportChat } from './features/support/OperatorSupportChat';
import { TeamPage } from './pages/TeamPage';
import { InvitePage } from './pages/InvitePage';
import { SetupPasswordPage } from './pages/SetupPasswordPage';
import { notificationService } from './services/notification.service';
import { MasterScreen } from './features/master/MasterScreen';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { PersonalFinancesPage } from './pages/PersonalFinancesPage';

export const App: React.FC = () => {
  // Hooks de Infraestrutura
  const { portalToken, legalSignToken } = usePortalRouting();
  const { toast, showToast } = useToast();
  
  const {
    activeProfileId,
    loginUser, setLoginUser,
    loginPassword, setLoginPassword,
    savedProfiles,
    submitLogin,
    handleLogout,
    handleSelectSavedProfile,
    handleRemoveSavedProfile,
  } = useAuth();

  const {
    loans, setLoans,
    clients, setClients,
    sources, setSources,
    activeUser, setActiveUser,
    staffMembers, systemUsers,
    selectedStaffId, setSelectedStaffId,
    isLoadingData, setIsLoadingData,
    fetchFullData,
    activeTab, setActiveTab,
    statusFilter, setStatusFilter,
    sortOption, setSortOption,
    searchTerm, setSearchTerm,
    clientSearchTerm, setClientSearchTerm,
    profileEditForm, setProfileEditForm,
    loadError,
    navOrder, hubOrder,
    saveNavConfig,
  } = useAppState(activeProfileId);

  const ui = useUiState() as any;
  ui.sortOption = sortOption;
  ui.setSortOption = setSortOption;
  ui.staffMembers = staffMembers;

  const isPublicView = !!portalToken || !!legalSignToken;

  usePersistedTab(activeTab, setActiveTab);

  const controllers = useControllers(
    activeUser, ui, loans, setLoans, clients, setClients,
    sources, setSources, setActiveUser, setIsLoadingData,
    fetchFullData, () => Promise.resolve(), handleLogout,
    showToast, profileEditForm, setProfileEditForm
  );

  const { loanCtrl, clientCtrl, sourceCtrl, profileCtrl, paymentCtrl, fileCtrl, aiCtrl, adminCtrl } = controllers;

  useAppNotifications({
    loans, sources, activeUser, showToast, setActiveTab,
    setSelectedLoanId: ui.setSelectedLoanId,
    disabled: isPublicView,
  });

  // 1. Monitoramento de Erros de Carga (Correção Infinite Loading)
  useEffect(() => {
    if (loadError) {
      showToast(loadError, 'error');
      setIsLoadingData(false); // Força parada do loading em caso de erro
    }
  }, [loadError]);

  // 2. Anti-Saída Acidental (Proteção contra fechamento de aba)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Só ativa se estiver logado e não for uma visão pública
      if (activeUser && !isPublicView) {
        e.preventDefault();
        e.returnValue = ''; // Padrão para navegadores modernos exibirem o alerta
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeUser, isPublicView]);

  // Init Notifications Permissions (apenas se logado E não for view pública)
  useEffect(() => {
    if (activeUser && !isPublicView) {
        notificationService.requestPermission();
    }
  }, [activeUser, isPublicView]);

  const effectiveSelectedStaffId = activeUser && activeUser.accessLevel === 2 ? activeUser.id : selectedStaffId;
  const isInvitePath = window.location.pathname === '/invite' || window.location.pathname === '/setup-password';

  // 3. Tela de Carregamento Global (Splash Screen)
  // Lógica corrigida: Se houver loadError, NÃO mostra loading (deixa cair pro AuthScreen)
  const isInitializing = (
      (!!activeProfileId && !activeUser && !loadError) || 
      (!!activeUser && isLoadingData && loans.length === 0 && !loadError)
  );

  if (isInitializing && !isPublicView && !isInvitePath) {
    return <LoadingScreen />;
  }

  return (
    <>
      {isInvitePath ? (
        <>
          {window.location.pathname === '/invite' && <InvitePage />}
          {window.location.pathname === '/setup-password' && <SetupPasswordPage />}
        </>
      ) : (
        <AppGate
          portalToken={portalToken}
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
          {activeUser?.accessLevel === 1 ? (
            <MasterScreen
              activeUser={activeUser}
              systemUsers={systemUsers}
              fetchFullData={fetchFullData}
              handleLogout={handleLogout}
              showToast={showToast}
            />
          ) : (
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
              onOpenSupport={() => ui.openModal('SUPPORT_CHAT')}
              navOrder={navOrder}
            >
              <div className="hidden">
                 {/* Componentes de layout ocultos mas renderizados para lógica se necessário, ou limpeza futura */}
              </div>

              {activeTab === 'DASHBOARD' && (
                <DashboardContainer
                  loans={loans} sources={sources} activeUser={activeUser}
                  staffMembers={staffMembers} selectedStaffId={effectiveSelectedStaffId}
                  setSelectedStaffId={setSelectedStaffId}
                  mobileDashboardTab={ui.mobileDashboardTab} setMobileDashboardTab={ui.setMobileDashboardTab}
                  statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                  searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                  ui={ui} loanCtrl={loanCtrl} fileCtrl={fileCtrl}
                  showToast={showToast} onRefresh={() => fetchFullData(activeUser?.id || '')}
                />
              )}

              {activeTab === 'CLIENTS' && (
                <ClientsContainer
                  clients={clients} clientSearchTerm={clientSearchTerm}
                  setClientSearchTerm={setClientSearchTerm}
                  clientCtrl={clientCtrl} loanCtrl={loanCtrl}
                  showToast={showToast} ui={ui}
                />
              )}

              {activeTab === 'TEAM' && !activeUser?.supervisor_id && (
                <TeamPage activeUser={activeUser} showToast={showToast} onRefresh={() => fetchFullData(activeUser?.id || '')} />
              )}

              {activeTab === 'SOURCES' && (
                <SourcesContainer sources={sources} ui={ui} sourceCtrl={sourceCtrl} loanCtrl={loanCtrl} />
              )}

              {activeTab === 'PROFILE' && activeUser && (
                <ProfileContainer
                  activeUser={activeUser} clients={clients} loans={loans} sources={sources}
                  ui={ui} profileCtrl={profileCtrl} handleLogout={handleLogout} showToast={showToast}
                  profileEditForm={profileEditForm} setProfileEditForm={setProfileEditForm}
                  fileCtrl={fileCtrl} navOrder={navOrder} hubOrder={hubOrder} saveNavConfig={saveNavConfig}
                />
              )}

              {activeTab === 'LEGAL' && (
                <LegalContainer
                  loans={loans} sources={sources} activeUser={activeUser}
                  ui={ui} loanCtrl={loanCtrl} fileCtrl={fileCtrl}
                  showToast={showToast} onRefresh={() => fetchFullData(activeUser?.id || '')}
                />
              )}

              {activeTab === 'PERSONAL_FINANCE' && activeUser && (
                <PersonalFinancesPage activeUser={activeUser} />
              )}

              <ModalHostContainer
                ui={ui} activeUser={activeUser} clients={clients} sources={sources} loans={loans}
                isLoadingData={isLoadingData} loanCtrl={loanCtrl} clientCtrl={clientCtrl}
                sourceCtrl={sourceCtrl} paymentCtrl={paymentCtrl} profileCtrl={profileCtrl}
                adminCtrl={adminCtrl} fileCtrl={fileCtrl} aiCtrl={aiCtrl}
                showToast={showToast} fetchFullData={fetchFullData} handleLogout={handleLogout}
              />

              {ui.activeModal?.type === 'SUPPORT_CHAT' && (
                <OperatorSupportChat activeUser={activeUser} onClose={ui.closeModal} />
              )}

              <NavHubController ui={ui} setActiveTab={setActiveTab} activeUser={activeUser} hubOrder={hubOrder} />
            </AppShell>
          )}
        </AppGate>
      )}
    </>
  );
};
