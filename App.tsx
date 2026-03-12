// src/App.tsx
import React, { useEffect, lazy, Suspense, useCallback } from 'react';

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
import { useExitGuard } from './hooks/useExitGuard';
import { useNavigationStack } from './hooks/useNavigationStack';

import { notificationService } from './services/notification.service';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { isDev } from './utils/isDev';
import { Agreement, AgreementInstallment, Loan } from './types';
import { agreementService } from './features/agreements/services/agreementService';

// Lazy loading components for optimization
const DashboardContainer = lazy(() => import('./containers/DashboardContainer').then(m => ({ default: m.DashboardContainer })));
const ClientsContainer = lazy(() => import('./containers/ClientsContainer').then(m => ({ default: m.ClientsContainer })));
const SourcesContainer = lazy(() => import('./containers/SourcesContainer').then(m => ({ default: m.SourcesContainer })));
const ProfileContainer = lazy(() => import('./containers/ProfileContainer').then(m => ({ default: m.ProfileContainer })));
const LegalContainer = lazy(() => import('./containers/LegalContainer').then(m => ({ default: m.LegalContainer })));
const ModalHostContainer = lazy(() => import('./containers/ModalHostContainer').then(m => ({ default: m.ModalHostContainer })));

const OperatorSupportChat = lazy(() => import('./features/support/OperatorSupportChat').then(m => ({ default: m.OperatorSupportChat })));
const CalendarView = lazy(() => import('./features/calendar/CalendarView').then(m => ({ default: m.CalendarView })));
const SimulatorPanel = lazy(() => import('./features/simulator/SimulatorPanel').then(m => ({ default: m.SimulatorPanel })));
const FlowModal = lazy(() => import('./components/modals/FlowModal').then(m => ({ default: m.FlowModal })));

const TeamPage = lazy(() => import('./pages/TeamPage').then(m => ({ default: m.TeamPage })));
const InvitePage = lazy(() => import('./pages/InvitePage').then(m => ({ default: m.InvitePage })));
const SetupPasswordPage = lazy(() => import('./pages/SetupPasswordPage').then(m => ({ default: m.SetupPasswordPage })));
const PersonalFinancesPage = lazy(() => import('./pages/PersonalFinancesPage').then(m => ({ default: m.PersonalFinancesPage })));
const LeadsPage = lazy(() => import('./pages/LeadsPage').then(m => ({ default: m.LeadsPage })));
const CustomerAcquisitionPage = lazy(() => import('./pages/Comercial/CaptacaoClientes').then(m => ({ default: m.CustomerAcquisitionPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ContractDetailsPage = lazy(() => import('./pages/ContractDetailsPage').then(m => ({ default: m.ContractDetailsPage })));

const PublicCampaignPage = lazy(() => import('./pages/Public/PublicCampaignPage').then(m => ({ default: m.PublicCampaignPage })));
const PublicSignaturePage = lazy(() => import('./pages/Public/PublicSignaturePage').then(m => ({ default: m.PublicSignaturePage })));

export const App: React.FC = () => {
  // ✅ SEMPRE calcular params, mas NÃO dar return antes dos hooks
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('campaign_id');
  const legalSignTokenParam = urlParams.get('legal_sign');

  // ✅ Hooks SEMPRE no topo (regra do React)
  const { portalToken, portalCode } = usePortalRouting();
  const { toast, showToast, clearToast } = useToast();

  const {
    activeProfileId,
    loginUser,
    setLoginUser,
    loginPassword,
    setLoginPassword,
    savedProfiles,
    submitLogin,
    submitTeamLogin,
    handleLogout,
    handleSelectSavedProfile,
    handleRemoveSavedProfile,
    bootFinished,
    isLoading: authLoading,
    reauthenticate,
  } = useAuth();

  const {
    loans,
    setLoans,
    clients,
    setClients,
    sources,
    setSources,
    activeUser,
    setActiveUser,
    staffMembers,
    systemUsers,
    selectedStaffId,
    setSelectedStaffId,
    isLoadingData,
    setIsLoadingData,
    fetchFullData,
    activeTab,
    setActiveTab,
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
    loadError,
    setLoadError,
    navOrder,
    hubOrder,
    saveNavConfig,
  } = useAppState(activeProfileId, handleLogout);

  const ui = useUiState() as any;
  ui.sortOption = sortOption;
  ui.setSortOption = setSortOption;
  ui.staffMembers = staffMembers;

  const handleSetActiveTab = useCallback((tab: any) => {
    if (window.location.pathname.startsWith('/contrato/')) {
      window.history.replaceState({}, '', '/');
    }
    setActiveTab(tab);
  }, [setActiveTab]);

  const openNavHub = useCallback(() => ui.setShowNavHub(true), [ui.setShowNavHub]);
  const { goBack, isInHub } = useNavigationStack(activeTab, handleSetActiveTab, openNavHub);

  const isInvitePath =
    window.location.pathname === '/invite' || window.location.pathname === '/setup-password';

  const contractMatch = window.location.pathname.match(/^\/contrato\/([a-f0-9-]+)$/i);
  const contractIdFromUrl = contractMatch ? contractMatch[1] : null;

  // ✅ token público de assinatura vem ou do hook (portal) ou do querystring
  const legalSignToken = legalSignTokenParam || null;

  // ✅ view pública: portalToken OU rota pública de campanha OU assinatura pública
  const isPublicView = !!portalToken || !!campaignId || !!legalSignToken;

  useEffect(() => {
    if (contractIdFromUrl && activeTab !== 'CONTRACT_DETAILS') {
      ui.setSelectedLoanId(contractIdFromUrl);
      handleSetActiveTab('CONTRACT_DETAILS');
    }
  }, [contractIdFromUrl, activeTab, handleSetActiveTab]);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    const url = new URL(path, window.location.origin);
    const pathname = url.pathname;
    
    const match = pathname.match(/^\/contratos?\/([a-f0-9-]+)/i);
    if (match) {
      ui.setSelectedLoanId(match[1]);
      handleSetActiveTab('CONTRACT_DETAILS');
    } else if (pathname.startsWith('/clientes')) {
      handleSetActiveTab('CLIENTS');
    } else if (pathname.startsWith('/fontes')) {
      handleSetActiveTab('SOURCES');
    } else if (pathname.startsWith('/suporte')) {
      ui.openModal('SUPPORT_CHAT');
    } else if (pathname.startsWith('/leads')) {
      handleSetActiveTab('LEADS');
    } else if (pathname === '/' || pathname === '/dashboard') {
      handleSetActiveTab('DASHBOARD');
    } else {
      handleSetActiveTab('DASHBOARD');
    }
  };

  usePersistedTab(activeTab, handleSetActiveTab);

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
    () => Promise.resolve(),
    handleLogout,
    showToast,
    profileEditForm,
    setProfileEditForm
  );

  const { loanCtrl, clientCtrl, sourceCtrl, profileCtrl, paymentCtrl, fileCtrl, aiCtrl, adminCtrl } =
    controllers;

  const { notifications, removeNotification } = useAppNotifications({
    loans,
    sources,
    activeUser,
    showToast,
    setActiveTab,
    setSelectedLoanId: ui.setSelectedLoanId,
    disabled: isPublicView,
  });

  useExitGuard(activeUser, activeTab, setActiveTab, isPublicView, showToast, ui);

  useEffect(() => {
    if (activeUser && !isPublicView) {
      notificationService.requestPermission();
    }
  }, [activeUser, isPublicView]);

  // Timeout de Segurança para o Loading (10 segundos)
  useEffect(() => {
    if (activeProfileId && !activeUser && bootFinished && !loadError) {
      const timer = setTimeout(() => {
        if (!activeUser && !loadError) {
          setLoadError('Tempo limite de sincronização excedido. Verifique sua conexão ou tente reconectar.');
          if (isDev) console.error('[BOOT] Timeout atingido tentando carregar perfil:', activeProfileId);
        }
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeProfileId, activeUser, bootFinished, loadError, setLoadError]);

  const effectiveSelectedStaffId =
    activeUser && activeUser.accessLevel === 2 ? activeUser.id : selectedStaffId;

  const isInitializing = !bootFinished || (!!activeProfileId && !activeUser && !loadError);

  // ✅ Agora SIM pode retornar rotas públicas (depois dos hooks)
  if (campaignId) return (
    <Suspense fallback={<LoadingScreen />}>
      <PublicCampaignPage />
    </Suspense>
  );
  if (legalSignTokenParam) return (
    <Suspense fallback={<LoadingScreen />}>
      <PublicSignaturePage />
    </Suspense>
  );

  if (isInitializing && !isPublicView && !isInvitePath) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      {isInvitePath ? (
        <>
          {window.location.pathname === '/invite' && <InvitePage />}
          {window.location.pathname === '/setup-password' && <SetupPasswordPage />}
        </>
      ) : (
        <AppGate
          portalToken={portalToken}
          portalCode={portalCode}
          legalSignToken={legalSignToken}
          activeProfileId={activeProfileId}
          activeUser={activeUser}
          isLoadingData={isLoadingData || authLoading}
          loadError={loadError}
          loginUser={loginUser}
          setLoginUser={setLoginUser}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          submitLogin={() => submitLogin(showToast)}
          submitTeamLogin={(params, toastArg) => submitTeamLogin(params, toastArg)}
          savedProfiles={savedProfiles}
          handleSelectSavedProfile={handleSelectSavedProfile}
          handleRemoveSavedProfile={handleRemoveSavedProfile}
          showToast={showToast}
          setIsLoadingData={setIsLoadingData}
          toast={toast}
          reauthenticate={reauthenticate}
          onReauthSuccess={() => {
            setLoadError(null);
            if (activeProfileId) fetchFullData(activeProfileId);
          }}
        >
          <AppShell
            toast={toast}
            clearToast={clearToast}
            activeTab={activeTab}
            setActiveTab={handleSetActiveTab}
            activeUser={activeUser}
            isLoadingData={isLoadingData}
            onOpenNav={() => ui.setShowNavHub(true)}
            onNewLoan={() => {
              ui.setEditingLoan(null);
              ui.openModal('LOAN_FORM');
            }}
            isStealthMode={ui.isStealthMode}
            toggleStealthMode={() => ui.setIsStealthMode(!ui.isStealthMode)}
            onOpenSupport={() => ui.openModal('SUPPORT_CHAT')}
            navOrder={navOrder}
            onGoBack={goBack}
            isInHub={isInHub}
            title={activeTab === 'CONTRACT_DETAILS' ? loans.find(l => l.id === ui.selectedLoanId)?.debtorName : undefined}
            subtitle={activeTab === 'CONTRACT_DETAILS' ? loans.find(l => l.id === ui.selectedLoanId)?.debtorPhone : undefined}
            notifications={notifications}
            removeNotification={removeNotification}
            onNavigate={navigate}
          >
            {activeTab === 'DASHBOARD' && (
              <DashboardContainer
                loans={loans}
                sources={sources}
                activeUser={activeUser}
                staffMembers={staffMembers}
                selectedStaffId={effectiveSelectedStaffId}
                setSelectedStaffId={setSelectedStaffId}
                mobileDashboardTab={ui.mobileDashboardTab}
                setMobileDashboardTab={ui.setMobileDashboardTab}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                ui={ui}
                loanCtrl={loanCtrl}
                fileCtrl={fileCtrl}
                showToast={showToast}
                onRefresh={() => fetchFullData(activeUser?.id || '')}
                onNavigate={(id) => navigate(`/contrato/${id}`)}
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
                goBack={goBack}
              />
            )}

            {activeTab === 'TEAM' && !activeUser?.supervisor_id && (
              <TeamPage
                activeUser={activeUser}
                showToast={showToast}
                onRefresh={() => fetchFullData(activeUser?.id || '')}
                ui={ui}
                goBack={goBack}
              />
            )}

            {activeTab === 'SOURCES' && (
              <SourcesContainer 
                loans={loans} 
                sources={sources} 
                ui={ui} 
                sourceCtrl={sourceCtrl} 
                loanCtrl={loanCtrl} 
                goBack={goBack} 
                activeUser={activeUser} 
                onRefresh={() => fetchFullData(activeUser?.supervisor_id || activeUser?.id || '')}
              />
            )}

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
                navOrder={navOrder}
                hubOrder={hubOrder}
                saveNavConfig={saveNavConfig}
                goBack={goBack}
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
                goBack={goBack}
              />
            )}

            {activeTab === 'PERSONAL_FINANCE' && activeUser && (
              <PersonalFinancesPage activeUser={activeUser} goBack={goBack} />
            )}

            {activeTab === 'LEADS' && activeUser && <LeadsPage activeUser={activeUser} goBack={goBack} />}

            {activeTab === 'ACQUISITION' && <CustomerAcquisitionPage activeUser={activeUser} goBack={goBack} />}

            {activeTab === 'SETTINGS' && <SettingsPage />}

            {activeTab === 'CONTRACT_DETAILS' && ui.selectedLoanId && (
              <ContractDetailsPage 
                loanId={ui.selectedLoanId}
                loans={loans}
                sources={sources}
                activeUser={activeUser}
                onBack={() => {
                  ui.setSelectedLoanId(null);
                  if (window.location.pathname.startsWith('/contrato/')) {
                    window.history.replaceState({}, '', '/');
                  }
                  goBack();
                }}
                onPayment={async (forgive, date, amount, realDate, interest, contextOverride) => {
                  await paymentCtrl.handlePayment(forgive, date, amount, realDate, interest, undefined, undefined, contextOverride);
                  fetchFullData(activeUser?.id || '');
                }}
                isProcessing={ui.isProcessingPayment}
                onOpenMessage={(l) => { ui.setMessageModalLoan(l); ui.openModal('MESSAGE_HUB'); }}
                onRenegotiate={(l) => { 
                    const loans = Array.isArray(l) ? l : [l];
                    ui.setRenegotiationModalLoans(loans); 
                    ui.openModal('RENEGOTIATION', loans[0]); 
                }}
                onGenerateContract={(l) => loanCtrl.handleGenerateLink(l)}
                onExportExtrato={(l) => loanCtrl.handleExportExtrato(l)}
                onEdit={(l) => { ui.setEditingLoan(l); ui.openModal('LOAN_FORM', l); }}
                onArchive={(l) => loanCtrl.openConfirmation({ 
                    type: 'ARCHIVE', 
                    target: l, 
                    showRefundOption: true,
                    title: 'Arquivar Contrato?',
                    message: 'O contrato sairá da lista ativa, mas poderá ser restaurado depois.'
                })}
                onRestore={(l) => loanCtrl.openConfirmation({ 
                    type: 'RESTORE', 
                    target: l,
                    title: 'Restaurar Contrato?',
                    message: 'O contrato voltará para a lista de contratos ativos.'
                })}
                onDelete={(l) => loanCtrl.openConfirmation({ 
                    type: 'DELETE', 
                    target: l, 
                    showRefundOption: true,
                    title: 'Excluir Permanentemente?',
                    message: 'Todos os dados, parcelas e histórico serão apagados para sempre.'
                })}
                onReverseTransaction={loanCtrl.openReverseTransaction}
                onActivate={loanCtrl.handleActivateLoan}
                onAgreementPayment={async (loan: Loan, agreement: Agreement, inst: AgreementInstallment) => {
                  if (!activeUser) return;
                  try {
                      await agreementService.processPayment(agreement, inst, inst.amount, loan.sourceId, activeUser);
                      showToast("Parcela do acordo recebida!", "success");
                      ui.setShowReceipt({ loan, inst: { ...inst, agreementId: agreement.id }, amountPaid: inst.amount, type: 'AGREEMENT_PAYMENT' });
                      ui.openModal('RECEIPT');
                      fetchFullData(activeUser?.id || '');
                  } catch (e: any) {
                      showToast("Erro ao processar pagamento: " + e.message, "error");
                  }
                }}
                onRefresh={() => fetchFullData(activeUser?.id || '')}
                isStealthMode={ui.isStealthMode}
              />
            )}

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

            {activeTab === 'SIMULATOR' && <SimulatorPanel onClose={goBack} />}

            {activeTab === 'AGENDA' && (
              <CalendarView
                activeUser={activeUser}
                showToast={showToast}
                onClose={goBack}
                onSystemAction={(type, meta) => {
                  if (type === 'NAVIGATE_CONTRACT' && meta?.loanId) {
                    ui.setSelectedLoanId(meta.loanId);
                    handleSetActiveTab('CONTRACT_DETAILS');
                    return;
                  }
                  if (type === 'PAYMENT' && meta && ui) {
                    ui.setPaymentModal({
                      loan: {
                        id: meta.loanId,
                        debtorName: meta.clientName,
                        debtorPhone: meta.clientPhone,
                        sourceId: meta.sourceId,
                      },
                      inst: { id: meta.installmentId, dueDate: meta.start_time },
                      calculations: { total: meta.amount, principal: meta.amount, interest: 0, lateFee: 0 },
                    });
                    if (ui.openModal) ui.openModal('PAYMENT');
                  }
                  if (type === 'OPEN_CHAT' && meta && ui) {
                    const loan = loans.find((l: any) => l.id === meta.loanId);
                    if (loan) {
                      ui.setMessageModalLoan(loan);
                      ui.openModal('MESSAGE_HUB');
                    }
                  }
                }}
              />
            )}

            {activeTab === 'FLOW' && activeUser && (
              <FlowModal 
                onClose={goBack} 
                loans={loans} 
                profit={
                  sources.find(s => {
                    const n = (s.name || '').toLowerCase();
                    return n.includes('caixa livre') || n === 'lucro' || n.includes('lucro');
                  })?.balance || activeUser.interestBalance || 0
                } 
              />
            )}

            {ui.activeModal?.type === 'SUPPORT_CHAT' && (
              <OperatorSupportChat activeUser={activeUser} onClose={ui.closeModal} />
            )}

            <NavHubController ui={ui} setActiveTab={handleSetActiveTab} activeUser={activeUser} hubOrder={hubOrder} />
          </AppShell>
        </AppGate>
      )}
    </Suspense>
  );
};