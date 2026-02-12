import React from 'react';
import { supabase } from '../../lib/supabase';
import { operatorProfileService } from '../../features/profile/services/operatorProfileService';
import { readBackupFile } from '../../services/dataService';
import { UserProfile } from '../../types';

// helpers
const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeUUID = (v: any) => (isUUID(v) ? v : null);

export const useProfileController = (
  activeUser: UserProfile | null,
  ui: any,
  profileEditForm: UserProfile | null,
  setProfileEditForm: any,
  setActiveUser: any,
  setIsLoadingData: any,
  fetchFullData: (id: string) => Promise<void>,
  handleLogout: () => void,
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
) => {
  const getOwnerId = (u: UserProfile) => safeUUID((u as any).supervisor_id) || safeUUID(u.id);

  const handleSaveProfile = async () => {
    if (!activeUser || !profileEditForm) return;

    if (!profileEditForm.name.trim()) {
      showToast('O Nome do Operador é obrigatório.', 'error');
      return;
    }

    if (activeUser.id === 'DEMO') {
      setActiveUser(profileEditForm);
      showToast('Perfil atualizado (Modo Demo)!', 'success');
      return;
    }

    setIsLoadingData(true);
    try {
      const updatedProfile = await operatorProfileService.updateProfile(activeUser.id, profileEditForm, 'MANUAL');
      if (updatedProfile) {
        setActiveUser(updatedProfile);
        setProfileEditForm(updatedProfile);
        showToast('Perfil atualizado com sucesso!', 'success');
      }
    } catch (error: any) {
      showToast('Erro ao atualizar perfil: ' + error.message, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileEditForm || !activeUser) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Imagem muito grande (máx 2MB).', 'error');
      return;
    }

    setIsLoadingData(true);
    try {
      if (activeUser.id === 'DEMO') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileEditForm({ ...profileEditForm, photo: reader.result as string });
          showToast('Foto atualizada (Modo Demo)', 'info');
        };
        reader.readAsDataURL(file);
        return;
      }

      const publicUrl = await operatorProfileService.uploadAvatar(file, activeUser.id);
      setProfileEditForm({ ...profileEditForm, photo: publicUrl });
      showToast("Foto carregada! Clique em 'Salvar Perfil' para confirmar.", 'success');
    } catch (err: any) {
      showToast('Erro no upload: ' + err.message, 'error');
    } finally {
      setIsLoadingData(false);
      e.target.value = '';
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUser) return;

    if (activeUser.id === 'DEMO') {
      showToast('Restauração indisponível em Demo.', 'error');
      return;
    }

    if (!window.confirm('Isso reverterá seus dados para o estado do backup. Continuar?')) return;

    setIsLoadingData(true);
    try {
      const backupData = await readBackupFile(file);
      const updated = await operatorProfileService.restoreProfileFromSnapshot(backupData.profile, activeUser.id);
      setActiveUser(updated);
      setProfileEditForm(updated);
      showToast('Perfil restaurado!', 'success');
    } catch (error: any) {
      showToast('Falha na restauração: ' + error.message, 'error');
    } finally {
      setIsLoadingData(false);
      e.target.value = '';
    }
  };

  /**
   * ✅ LIMPEZA DEFINITIVA
   * - Dados da conta: ownerId (clientes/contratos)
   * - Dados operacionais: operatorId (fontes, avatar etc.)
   */
  const executeCleanData = async (ownerId: string, operatorId: string) => {
    // segurança
    if (!isUUID(ownerId) || !isUUID(operatorId)) throw new Error('IDs inválidos para limpeza.');

    // 1) Dependentes por profile_id (seu schema mostra isso)
    await supabase.from('transacoes').delete().eq('profile_id', ownerId);
    await supabase.from('sinalizacoes_pagamento').delete().eq('profile_id', ownerId);
    await supabase.from('parcelas').delete().eq('profile_id', ownerId);

    // 2) Cabeçalhos por owner_id (seu schema mostra isso)
    await supabase.from('contratos').delete().eq('owner_id', ownerId);
    await supabase.from('clientes').delete().eq('owner_id', ownerId);

    // 3) Itens do operador (carteiras/fontes são do operador no app)
    await supabase.from('fontes').delete().eq('profile_id', operatorId);

    // 4) Jurídico (mantém por profile_id, igual o restante do app)
    await supabase.from('documentos_juridicos').delete().eq('profile_id', ownerId);
  };

  const handleResetData = async () => {
    if (!activeUser) return;

    if (activeUser.id !== 'DEMO' && ui.resetPasswordInput !== activeUser.password) {
      showToast('Senha de autenticação incorreta.', 'error');
      return;
    }

    const ownerId = getOwnerId(activeUser);
    const operatorId = safeUUID(activeUser.id);

    if (!ownerId || !operatorId) {
      showToast('Perfil inválido. Refaça login.', 'error');
      return;
    }

    setIsLoadingData(true);
    try {
      await executeCleanData(ownerId, operatorId);

      // zera métricas no PERFIL DA CONTA (owner)
      await supabase
        .from('perfis')
        .update({ total_available_capital: 0, interest_balance: 0 })
        .eq('id', ownerId);

      showToast('Banco de dados resetado com sucesso!', 'success');
      ui.closeModal();

      // recarrega pela conta (owner)
      await fetchFullData(ownerId);
    } catch (e: any) {
      showToast('Erro ao resetar: ' + e.message, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!activeUser) return;
    if (activeUser.id === 'DEMO') return;

    if (!ui.deleteAccountAgree || ui.deleteAccountConfirm !== 'DELETAR' || ui.resetPasswordInput !== activeUser.password) {
      showToast('Validação de segurança falhou.', 'error');
      return;
    }

    const ownerId = getOwnerId(activeUser);
    const operatorId = safeUUID(activeUser.id);

    if (!ownerId || !operatorId) {
      showToast('Perfil inválido. Refaça login.', 'error');
      return;
    }

    setIsLoadingData(true);
    try {
      await executeCleanData(ownerId, operatorId);

      // apaga a conta (owner)
      await supabase.from('perfis').delete().eq('id', ownerId);

      showToast('Sua conta foi excluída permanentemente.', 'success');
      handleLogout();
    } catch (e: any) {
      showToast('Erro ao excluir conta: ' + e.message, 'error');
    } finally {
      setIsLoadingData(false);
      ui.closeModal();
    }
  };

  return {
    handleSaveProfile,
    handlePhotoUpload,
    handleRestoreBackup,
    handleDeleteAccount,
    handleResetData,
  };
};