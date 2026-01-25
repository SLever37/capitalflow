
import React from 'react';
import { operatorProfileService } from '../../features/profile/services/operatorProfileService';
import { readBackupFile } from '../../services/dataService';
import { UserProfile } from '../../types';

export const useProfileController = (
  activeUser: UserProfile | null,
  ui: any,
  profileEditForm: UserProfile | null,
  setProfileEditForm: any,
  setActiveUser: any,
  setIsLoadingData: any,
  fetchFullData: (id: string) => Promise<void>,
  handleLogout: () => void,
  showToast: (msg: string, type?: 'success' | 'error') => void
) => {

  // --- SAVE PROFILE ---
  const handleSaveProfile = async () => {
      if (!activeUser || !profileEditForm) return;
      
      if (!profileEditForm.name.trim()) {
          showToast("O Nome do Operador não pode ficar vazio.", "error");
          return;
      }
      
      if (activeUser.id === 'DEMO') { 
          setActiveUser(profileEditForm); 
          showToast("Perfil atualizado (Demo)!", "success"); 
          return; 
      }
      
      setIsLoadingData(true);
      try {
          // Delegação total ao serviço seguro
          const updatedProfile = await operatorProfileService.updateProfile(activeUser.id, profileEditForm, 'MANUAL');
          
          if (updatedProfile) {
              setActiveUser(updatedProfile);
              setProfileEditForm(updatedProfile);
              showToast("Perfil atualizado e auditado com sucesso!", "success");
          }
      } catch (error: any) {
          console.error(error);
          showToast("Erro ao atualizar perfil: " + error.message, "error");
      } finally {
          setIsLoadingData(false);
      }
  };

  // --- PHOTO UPLOAD ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && profileEditForm) {
          if (file.size > 2 * 1024 * 1024) { showToast("A imagem deve ter no máximo 2MB.", "error"); return; }
          const reader = new FileReader();
          reader.onloadend = () => { setProfileEditForm({ ...profileEditForm, photo: reader.result as string }); };
          reader.readAsDataURL(file);
      }
  };

  // --- IMPORT FROM SHEET ---
  const handleImportProfile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeUser) return;
      
      if (activeUser.id === 'DEMO') {
          showToast("Importação indisponível no modo Demo.", "error");
          return;
      }

      if (!window.confirm("ATENÇÃO: Isso irá SUBSTITUIR seus dados cadastrais pelos da planilha. Confirmar?")) return;

      setIsLoadingData(true);
      try {
          const updated = await operatorProfileService.importProfileFromSheet(file, activeUser.id);
          setActiveUser(updated);
          setProfileEditForm(updated);
          showToast("Perfil restaurado via planilha!", "success");
      } catch (error: any) {
          showToast("Erro na importação: " + error.message, "error");
      } finally {
          setIsLoadingData(false);
          e.target.value = '';
      }
  };

  // --- RESTORE FROM BACKUP (JSON) ---
  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeUser) return;

      if (activeUser.id === 'DEMO') {
          showToast("Restauração indisponível no modo Demo.", "error");
          return;
      }

      if (!window.confirm("⚠️ RESTAURAÇÃO DE PERFIL\nIsso irá reverter seus dados cadastrais para o estado do backup.\nContinuar?")) return;

      setIsLoadingData(true);
      try {
          const backupData = await readBackupFile(file);
          if (!backupData.profile) throw new Error("O arquivo de backup não contém dados de perfil.");

          const updated = await operatorProfileService.restoreProfileFromSnapshot(backupData.profile, activeUser.id);
          setActiveUser(updated);
          setProfileEditForm(updated);
          showToast("Perfil restaurado com sucesso!", "success");
      } catch (error: any) {
          showToast("Falha na restauração: " + error.message, "error");
      } finally {
          setIsLoadingData(false);
          e.target.value = '';
      }
  };

  // --- ACTIONS ---
  const handleDeleteAccount = async () => { 
      if (!activeUser) return; 
      if (activeUser.id === 'DEMO') { showToast("Conta Demo não pode ser excluída.", "error"); return; } 
      ui.setDeleteAccountAgree(false); 
      ui.setDeleteAccountConfirm(''); 
      ui.setDeleteAccountModal(true); 
  };

  const handleResetData = async () => {
     if (!activeUser) return;
     if (activeUser.id === 'DEMO') { 
         if (!window.confirm("Zerar dados da demonstração?")) return; 
         setIsLoadingData(true); 
         fetchFullData('DEMO'); 
         showToast("Dados Demo resetados.", "success"); 
         ui.setResetDataModal(false); 
         setIsLoadingData(false);
         return; 
     }
     ui.setResetDataModal(true);
  };

  return {
    handleSaveProfile,
    handlePhotoUpload,
    handleImportProfile,
    handleRestoreBackup,
    handleDeleteAccount,
    handleResetData
  };
};
