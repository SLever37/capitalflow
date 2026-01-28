
import React from 'react';
import { supabase } from '../../lib/supabase';
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
      
      if (ui.deleteAccountConfirm === 'DELETAR') {
          setIsLoadingData(true);
          try {
              // Reutiliza a lógica robusta de limpeza de dados primeiro
              await executeCleanData(activeUser.id);
              
              // Por fim, remove o perfil
              const { error } = await supabase.from('perfis').delete().eq('id', activeUser.id);
              if (error) throw error;
              
              showToast("Conta excluída com sucesso. Até logo!", "success");
              handleLogout();
          } catch (e: any) {
              showToast("Erro ao excluir conta: " + e.message, "error");
          } finally {
              setIsLoadingData(false);
              ui.closeModal();
          }
      } else {
          ui.setDeleteAccountAgree(false); 
          ui.setDeleteAccountConfirm(''); 
          ui.openModal('DELETE_ACCOUNT'); 
      }
  };

  const handleResetData = async () => {
     if (!activeUser) return;
     if (activeUser.id === 'DEMO') { 
         if (!window.confirm("Zerar dados da demonstração?")) return; 
         setIsLoadingData(true); 
         fetchFullData('DEMO'); 
         showToast("Dados Demo resetados.", "success"); 
         ui.closeModal(); 
         setIsLoadingData(false);
         return; 
     }
     ui.setResetPasswordInput(''); 
     ui.openModal('RESET_DATA');
  };

  // Função auxiliar isolada para limpeza sequencial segura
  const executeCleanData = async (profileId: string) => {
      // 1. Limpeza de Logs de Acesso (Dependência Crítica de Clientes)
      // Precisamos buscar os IDs dos clientes primeiro, pois os logs apontam para eles.
      const { data: clients } = await supabase.from('clientes').select('id').eq('profile_id', profileId);
      if (clients && clients.length > 0) {
          const clientIds = clients.map(c => c.id);
          // Deleta em lotes para evitar timeout se houver muitos logs
          await supabase.from('logs_acesso_cliente').delete().in('client_id', clientIds);
      }

      // 2. Transações (Ledger) - Dependência Crítica de Fontes e Contratos
      // Deve ser apagado antes de contratos e fontes.
      await supabase.from('transacoes').delete().eq('profile_id', profileId);

      // 3. Módulo Jurídico e Acordos (Cascata Manual)
      await supabase.from('documentos_juridicos').delete().eq('profile_id', profileId);
      await supabase.from('acordo_pagamentos').delete().eq('profile_id', profileId);
      await supabase.from('acordo_parcelas').delete().eq('profile_id', profileId);
      await supabase.from('acordos_inadimplencia').delete().eq('profile_id', profileId);

      // 4. Módulo Operacional (Contratos e Parcelas)
      await supabase.from('sinalizacoes_pagamento').delete().eq('profile_id', profileId);
      await supabase.from('parcelas').delete().eq('profile_id', profileId);
      await supabase.from('contratos').delete().eq('profile_id', profileId);
      
      // 5. Clientes (Agora seguro pois logs e contratos foram removidos)
      await supabase.from('clientes').delete().eq('profile_id', profileId);
      
      // 6. Fontes (Agora seguro pois transações foram removidas)
      await supabase.from('fontes').delete().eq('profile_id', profileId);
  };

  // Executa o reset real (Chamado pelo botão "Confirmar Reset" no modal)
  const executeResetData = async () => {
      if (!activeUser) return;
      
      if (activeUser.id !== 'DEMO' && ui.resetPasswordInput !== activeUser.password) {
          showToast("Senha incorreta.", "error");
          return;
      }

      setIsLoadingData(true);
      try {
          await executeCleanData(activeUser.id);

          // Reset de sado no perfil para zerar caixa
          await supabase.from('perfis').update({ 
              total_available_capital: 0, 
              interest_balance: 0 
          }).eq('id', activeUser.id);

          showToast("Base de dados limpa com sucesso!", "success");
          ui.closeModal();
          await fetchFullData(activeUser.id);

      } catch (e: any) {
          console.error("Critical Reset Error:", e);
          showToast("Erro durante o reset: " + (e.message || "Violação de integridade"), "error");
      } finally {
          setIsLoadingData(false);
      }
  };

  return {
    handleSaveProfile,
    handlePhotoUpload,
    handleImportProfile,
    handleRestoreBackup,
    handleDeleteAccount,
    handleResetData,
    executeResetData
  };
};
