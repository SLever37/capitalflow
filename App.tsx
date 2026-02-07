
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
import { OperatorSupportChat } from './features/support/OperatorSupportChat';
import { TeamPage } from './pages/TeamPage';
import { HeaderBar } from './layout/HeaderBar';
import { BottomNav } from './layout/BottomNav';
import { notificationService } from './services/notification.service';

export const App: React.FC = () => {
  const { activeProfileId, loginUser, setLoginUser, loginPassword, setLoginPassword, savedProfiles, submitLogin, handleLogout, handleSelectSavedProfile, handleRemoveSavedProfile } = useAuth();
  const { toast, showToast } = useToast();
  const { loans, setLoans, clients, setClients, sources, setSources, activeUser, setActiveUser, staffMembers, systemUsers, selectedStaffId, setSelectedStaffId, isLoadingData, setIsLoadingData, fetchFullData, activeTab, setActiveTab, statusFilter, setStatusFilter, sortOption, setSortOption, searchTerm, setSearchTerm, clientSearchTerm, setClientSearchTerm, profileEditForm, setProfileEditForm, loadError, navOrder, hubOrder, saveNavConfig } = useAppState(activeProfileId);
  const ui = useUiState() as any;
  ui.sortOption = sortOption;
  ui.setSortOption = setSortOption;
  ui.staffMembers = staffMembers; 
  const { portalLoanId, legalSignToken } = usePortalRouting();
  const isPublicView = !!portalLoanId || !!legalSignToken;
  usePersistedTab(activeTab, setActiveTab);
  const controllers = useControllers(activeUser, ui, loans, setLoans, clients, setClients, sources, setSources, setActiveUser, setIsLoadingData, fetchFullData, () => Promise.resolve(), handleLogout, showToast, profileEditForm, setProfileEditForm);
  const { loanCtrl, clientCtrl, sourceCtrl, profileCtrl, adminCtrl, paymentCtrl, fileCtrl, aiCtrl } = controllers;
  useAppNotifications({ loans, sources, activeUser, showToast, setActiveTab, setSelectedLoanId: ui.setSelectedLoanId, disabled: isPublicView });
  const uiRef = useRef(ui);
  uiRef.current = ui;

  useEffect(() => {
    if (!activeUser && !portalLoanId && !legalSignToken) return;
    
    // 1. Solicita permissão para notificações do sistema (Barra do Android / Desktop)
    notificationService.requestPermission();

    // 2. Trava de histórico para botão Voltar
    window.history.pushState(null, document.title, window.location.href);
    
    const handlePopState = (event: PopStateEvent) => {
      const currentUi = uiRef.current;
      
      // Prioridade 1: Se houver modal aberto, fecha o modal e mantém no app
      if (currentUi.activeModal) { 
          currentUi.closeModal(); 
          window.history.pushState(null, '', window.location.href); 
          return; 
      }
      
      // Prioridade 2: Se houver NavHub aberto, fecha
      if (currentUi.showNavHub) { 
          currentUi.setShowNavHub(false); 
          window.history.pushState(null, '', window.location.href); 
          return; 
      }
      
      // Prioridade 3: Se não estiver na Dashboard, volta para Dashboard
      if (activeTab !== 'DASHBOARD' && !portalLoanId && !legalSignToken) { 
          setActiveTab('DASHBOARD'); 
          window.history.pushState(null, '', window.location.href); 
          return; 
      }

      // Prioridade 4: Anti-Saída (Confirmar antes de sair)
      // Ocorre quando está na Dashboard sem modais e aperta voltar
      const confirmExit = window.confirm("Deseja mesmo sair do sistema?");
      if (!confirmExit) {
          // Usuário cancelou a saída: Empurra o estado de volta para impedir o back
          window.history.pushState(null, '', window.location.href);
      } else {
          // Usuário confirmou: Executa Logout limpo
          handleLogout();
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeUser === null, !!portalLoanId, !!legalSignToken, activeTab]);

  // Se o usuário for STAFF (Nível 2), forçamos selectedStaffId para ele mesmo
  // Isso garante que o painel seja "extremamente funcional" mostrando apenas o dele
  const effectiveSelectedStaffId = (activeUser && activeUser.accessLevel === 2) ? activeUser.id : selectedStaffId;

  return (
    <>
      <AppGate portalLoanId={portalLoanId} legalSignToken={legalSignToken} activeProfileId={activeProfileId} activeUser={activeUser} isLoadingData={isLoadingData} loadError={loadError} loginUser={loginUser} setLoginUser={setLoginUser} loginPassword={loginPassword} setLoginPassword={setLoginPassword} submitLogin={submitLogin} savedProfiles={savedProfiles} handleSelectSavedProfile={handleSelectSavedProfile} handleRemoveSavedProfile={handleRemoveSavedProfile} showToast={showToast} setIsLoadingData={setIsLoadingData} toast={toast} >
        <AppShell toast={toast} activeTab={activeTab} setActiveTab={setActiveTab} activeUser={activeUser} isLoadingData={isLoadingData} onOpenNav={() => ui.setShowNavHub(true)} onNewLoan={() => { ui.setEditingLoan(null); ui.openModal('LOAN_FORM'); }} isStealthMode={ui.isStealthMode} toggleStealthMode={() => ui.setIsStealthMode(!ui.isStealthMode)} onOpenSupport={() => ui.openModal('SUPPORT_CHAT')} navOrder={navOrder}>
          
          <div className="hidden">
             <HeaderBar activeTab={activeTab} setActiveTab={setActiveTab} activeUser={activeUser} isLoadingData={isLoadingData} onOpenNav={() => ui.setShowNavHub(true)} onNewLoan={() => ui.openModal('LOAN_FORM')} isStealthMode={ui.isStealthMode} toggleStealthMode={() => ui.setIsStealthMode(!ui.isStealthMode)} navOrder={navOrder} />
             <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} onOpenNav={() => ui.setShowNavHub(true)} onNewLoan={() => ui.openModal('LOAN_FORM')} navOrder={navOrder} primaryColor={activeUser?.brandColor} />
          </div>

          {activeTab === 'DASHBOARD' && <DashboardContainer loans={loans} sources={sources} activeUser={activeUser} staffMembers={staffMembers} selectedStaffId={effectiveSelectedStaffId} setSelectedStaffId={setSelectedStaffId} mobileDashboardTab={ui.mobileDashboardTab} setMobileDashboardTab={ui.setMobileDashboardTab} statusFilter={statusFilter} setStatusFilter={setStatusFilter} searchTerm={searchTerm} setSearchTerm={setSearchTerm} ui={ui} loanCtrl={loanCtrl} fileCtrl={fileCtrl} showToast={showToast} onRefresh={() => fetchFullData(activeUser?.id || '')} />}
          {activeTab === 'CLIENTS' && <ClientsContainer clients={clients} clientSearchTerm={clientSearchTerm} setClientSearchTerm={setClientSearchTerm} clientCtrl={clientCtrl} loanCtrl={loanCtrl} showToast={showToast} ui={ui} />}
          {/* EQUIPE visível para operadores proprietários (sem supervisor_id) */}
          {activeTab === 'TEAM' && !activeUser?.supervisor_id && <TeamPage activeUser={activeUser} staffMembers={staffMembers} sources={sources} showToast={showToast} onRefresh={() => fetchFullData(activeUser?.id || '')} />}
          {activeTab === 'SOURCES' && <SourcesContainer sources={sources} ui={ui} sourceCtrl={sourceCtrl} loanCtrl={loanCtrl} />}
          {activeTab === 'PROFILE' && activeUser && <ProfileContainer activeUser={activeUser} clients={clients} loans={loans} sources={sources} ui={ui} profileCtrl={profileCtrl} handleLogout={handleLogout} showToast={showToast} profileEditForm={profileEditForm} setProfileEditForm={setProfileEditForm} fileCtrl={fileCtrl} navOrder={navOrder} hubOrder={hubOrder} saveNavConfig={saveNavConfig} />}
          {activeTab === 'LEGAL' && <LegalContainer loans={loans} sources={sources} activeUser={activeUser} ui={ui} loanCtrl={loanCtrl} fileCtrl={fileCtrl} showToast={showToast} onRefresh={() => fetchFullData(activeUser?.id || '')} />}
          {/* MasterContainer agora recebe systemUsers (lista global para SAC) */}
          {activeTab === 'MASTER' && activeUser?.accessLevel === 1 && <MasterContainer allUsers={systemUsers} ui={ui} adminCtrl={adminCtrl} />}
          
          <ModalHostContainer ui={ui} activeUser={activeUser} clients={clients} sources={sources} loans={loans} isLoadingData={isLoadingData} loanCtrl={loanCtrl} clientCtrl={clientCtrl} sourceCtrl={sourceCtrl} paymentCtrl={paymentCtrl} profileCtrl={profileCtrl} adminCtrl={adminCtrl} fileCtrl={fileCtrl} aiCtrl={aiCtrl} showToast={showToast} fetchFullData={fetchFullData} handleLogout={handleLogout} />
          {ui.activeModal?.type === 'SUPPORT_CHAT' && <OperatorSupportChat activeUser={activeUser} onClose={ui.closeModal} />}
          <NavHubController ui={ui} setActiveTab={setActiveTab} activeUser={activeUser} hubOrder={hubOrder} />
        </AppShell>
      </AppGate>
    </>
  );
};
