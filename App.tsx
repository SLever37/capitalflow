
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

import { DashboardContainer } from './containers/DashboardContainer';
import { ClientsContainer } from './containers/ClientsContainer';
import { SourcesContainer } from './containers/SourcesContainer';
import { ProfileContainer } from './containers/ProfileContainer';
import { MasterContainer } from './containers/MasterContainer';
import { ModalHostContainer } from './containers/ModalHostContainer';

export const App: React.FC = () => {
  const { activeProfileId, loginUser, setLoginUser, loginPassword, setLoginPassword, savedProfiles, submitLogin, handleLogout, handleSelectSavedProfile, handleRemoveSavedProfile } = useAuth();
  const { toast, showToast } = useToast();
  const { loans, setLoans, clients, setClients, sources, setSources, activeUser, setActiveUser, allUsers, isLoadingData, setIsLoadingData, fetchFullData, fetchAllUsers, activeTab, setActiveTab, mobileDashboardTab, setMobileDashboardTab, statusFilter, setStatusFilter, searchTerm, setSearchTerm, clientSearchTerm, setClientSearchTerm, profileEditForm, setProfileEditForm } = useAppState(activeProfileId);
  const ui = useUiState();
  const { portalLoanId } = usePortalRouting();
  usePersistedTab(activeTab, setActiveTab);

  const { loanCtrl, clientCtrl, sourceCtrl, profileCtrl, adminCtrl, paymentCtrl, fileCtrl, aiCtrl } = useControllers(
    activeUser, ui, loans, setLoans, clients, setClients, sources, setSources, setActiveUser, setIsLoadingData, fetchFullData, fetchAllUsers, handleLogout, showToast, profileEditForm, setProfileEditForm
  );

  // --- MECANISMO ANTISSAÍDA ACIDENTAL ---
  const exitAttemptRef = useRef(false);

  useEffect(() => {
    // Empurra um estado inicial para ter algo para "voltar"
    window.history.pushState(null, document.title, window.location.href);

    const handlePopState = (event: PopStateEvent) => {
        // 1. Verificar se há modais abertos e fechá-los (Prioridade Alta)
        const closeIfOpen = (isOpen: boolean, closeFn: () => void) => {
            if (isOpen) {
                closeFn();
                window.history.pushState(null, "", window.location.href); // Restaura a "armadilha"
                return true;
            }
            return false;
        };

        if (closeIfOpen(ui.isFormOpen, () => { ui.setIsFormOpen(false); ui.setEditingLoan(null); })) return;
        if (closeIfOpen(ui.isClientModalOpen, () => ui.setIsClientModalOpen(false))) return;
        if (closeIfOpen(ui.isSourceModalOpen, () => ui.setIsSourceModalOpen(false))) return;
        if (closeIfOpen(!!ui.paymentModal, () => ui.setPaymentModal(null))) return;
        if (closeIfOpen(!!ui.messageModalLoan, () => ui.setMessageModalLoan(null))) return;
        if (closeIfOpen(ui.showAgendaModal, () => ui.setShowAgendaModal(false))) return;
        if (closeIfOpen(ui.showCalcModal, () => ui.setShowCalcModal(false))) return;
        if (closeIfOpen(ui.showFlowModal, () => ui.setShowFlowModal(false))) return;
        if (closeIfOpen(!!ui.viewProofModal, () => ui.setViewProofModal(null))) return;
        if (closeIfOpen(!!ui.confirmation, () => ui.setConfirmation(null))) return;
        if (closeIfOpen(!!ui.masterEditUser, () => ui.setMasterEditUser(null))) return;
        if (closeIfOpen(ui.isAiAssistantOpen, () => ui.setIsAiAssistantOpen(false))) return;
        if (closeIfOpen(ui.showNavHub, () => ui.setShowNavHub(false))) return;

        // 2. Navegação entre Abas (Se não for Dashboard, volta para Dashboard)
        if (activeTab !== 'DASHBOARD') {
            setActiveTab('DASHBOARD');
            window.history.pushState(null, "", window.location.href);
            return;
        }

        // 3. Confirmação de Saída
        if (exitAttemptRef.current) {
            // Se pressionou duas vezes rápido, permite o comportamento padrão (sair/voltar histórico real)
            // Não fazemos pushState aqui, permitindo que o navegador saia ou volte a página anterior real
        } else {
            showToast("Pressione voltar novamente para sair.", "info");
            exitAttemptRef.current = true;
            window.history.pushState(null, "", window.location.href); // Restaura a "armadilha"
            
            setTimeout(() => {
                exitAttemptRef.current = false;
            }, 2000); // 2 segundos para confirmar
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, ui, showToast, setActiveTab]);

  return (
    <AppGate
      portalLoanId={portalLoanId}
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
    >
      <AppShell 
        toast={toast} activeTab={activeTab} setActiveTab={setActiveTab} activeUser={activeUser} 
        isLoadingData={isLoadingData} onOpenNav={() => ui.setShowNavHub(true)} onNewLoan={() => { ui.setEditingLoan(null); ui.setIsFormOpen(true); }}
        isStealthMode={ui.isStealthMode} toggleStealthMode={() => ui.setIsStealthMode(!ui.isStealthMode)}
        onOpenAssistant={() => ui.setIsAiAssistantOpen(true)} // ATIVADO
      >
        {activeTab === 'DASHBOARD' && (
            <DashboardContainer 
                loans={loans} sources={sources} activeUser={activeUser}
                mobileDashboardTab={mobileDashboardTab} setMobileDashboardTab={setMobileDashboardTab}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
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

        {activeTab === 'SOURCES' && (
            <SourcesContainer sources={sources} ui={ui} sourceCtrl={sourceCtrl} loanCtrl={loanCtrl} />
        )}

        {activeTab === 'PROFILE' && activeUser && (
            <ProfileContainer 
                activeUser={activeUser} clients={clients} loans={loans} sources={sources}
                ui={ui} profileCtrl={profileCtrl} handleLogout={handleLogout} showToast={showToast}
                profileEditForm={profileEditForm} setProfileEditForm={setProfileEditForm}
                fileCtrl={fileCtrl}
            />
        )}

        {activeTab === 'MASTER' && activeUser?.accessLevel === 1 && (
            <MasterContainer allUsers={allUsers} ui={ui} adminCtrl={adminCtrl} />
        )}

        <ModalHostContainer 
            ui={ui} activeUser={activeUser} clients={clients} sources={sources} loans={loans}
            loanCtrl={loanCtrl} clientCtrl={clientCtrl} sourceCtrl={sourceCtrl} paymentCtrl={paymentCtrl}
            profileCtrl={profileCtrl} adminCtrl={adminCtrl} fileCtrl={fileCtrl} aiCtrl={aiCtrl}
            showToast={showToast} fetchFullData={fetchFullData} handleLogout={handleLogout}
        />

        <NavHubController ui={ui} setActiveTab={setActiveTab} activeUser={activeUser} />
      </AppShell>
    </AppGate>
  );
};
