
import React from 'react';
import { supabase } from '../../lib/supabase';
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

  const handleSaveProfile = async () => {
      if (!activeUser || !profileEditForm) return;
      
      if (!profileEditForm.name.trim()) {
          showToast("O Nome do Operador não pode ficar vazio.", "error");
          return;
      }
      
      if (activeUser.id === 'DEMO') { setActiveUser(profileEditForm); showToast("Perfil atualizado (Demo)!", "success"); return; }
      
      const updates = {
          nome_operador: profileEditForm.name, 
          nome_empresa: profileEditForm.businessName, 
          document: profileEditForm.document, 
          phone: profileEditForm.phone, 
          address: profileEditForm.address, 
          pix_key: profileEditForm.pixKey, 
          avatar_url: profileEditForm.photo,
          // Novos Campos
          brand_color: profileEditForm.brandColor,
          logo_url: profileEditForm.logoUrl,
          default_interest_rate: profileEditForm.defaultInterestRate,
          default_fine_percent: profileEditForm.defaultFinePercent,
          default_daily_interest_percent: profileEditForm.defaultDailyInterestPercent,
          target_capital: profileEditForm.targetCapital,
          target_profit: profileEditForm.targetProfit
      };

      const { error } = await supabase.from('perfis').update(updates).eq('id', activeUser.id);
      if (error) { showToast("Erro ao atualizar perfil.", "error"); } else { setActiveUser(profileEditForm); showToast("Perfil atualizado!", "success"); }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && profileEditForm) {
          if (file.size > 2 * 1024 * 1024) { showToast("A imagem deve ter no máximo 2MB.", "error"); return; }
          const reader = new FileReader();
          reader.onloadend = () => { setProfileEditForm({ ...profileEditForm, photo: reader.result as string }); };
          reader.readAsDataURL(file);
      }
  };

  const handleDeleteAccount = async () => { if (!activeUser) return; if (activeUser.id === 'DEMO') { showToast("Conta Demo não pode ser excluída.", "error"); return; } ui.setDeleteAccountAgree(false); ui.setDeleteAccountConfirm(''); ui.setDeleteAccountModal(true); };

  const handleResetData = async () => {
     if (!activeUser) return;
     if (activeUser.id === 'DEMO') { if (!window.confirm("Zerar dados da demonstração?")) return; setIsLoadingData(true); fetchFullData('DEMO'); showToast("Dados Demo resetados.", "success"); ui.setResetDataModal(false); return; }
     if (!ui.resetPasswordInput) { showToast("Informe sua senha para confirmar.", "error"); return; }
     if (ui.resetPasswordInput !== activeUser.password) { showToast("Senha incorreta.", "error"); return; }
     if (!window.confirm("Tem certeza absoluta?")) { return; }
     setIsLoadingData(true);
     try {
         const pid = activeUser.id;
         const { data: loansData } = await supabase.from('contratos').select('id, client_id').eq('profile_id', pid);
         const loanIds = (loansData || []).map((l: any) => String(l.id));
         const clientIds = Array.from(new Set((loansData || []).map((l: any) => l.client_id).filter(Boolean).map((v: any) => String(v))));
         if (loanIds.length) { for (const table of ['transacoes', 'parcelas', 'sinalizacoes_pagamento']) { await supabase.from(table as any).delete().in('loan_id', loanIds); } }
         await supabase.from('contratos').delete().eq('profile_id', pid);
         await supabase.from('clientes').delete().eq('profile_id', pid);
         if (clientIds.length) await supabase.from('clientes').delete().in('id', clientIds);
         await supabase.from('fontes').delete().eq('profile_id', pid);
         await supabase.from('perfis').update({ interest_balance: 0, total_available_capital: 0 }).eq('id', pid);
         showToast("Todos os dados foram resetados.", "success"); ui.setResetDataModal(false); ui.setResetPasswordInput(''); fetchFullData(pid);
     } catch (e: any) { showToast("Erro ao resetar dados: " + (e?.message || "desconhecido"), "error"); } finally { setIsLoadingData(false); }
  };

  return {
    handleSaveProfile,
    handlePhotoUpload,
    handleDeleteAccount,
    handleResetData
  };
};
