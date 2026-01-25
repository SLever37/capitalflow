import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';

export const useAdminController = (
  activeUser: UserProfile | null,
  ui: any,
  fetchAllUsers: () => Promise<void>,
  showToast: (msg: string, type?: 'success' | 'error') => void
) => {

  const handleToggleAdmin = async (user: any) => {
    if (!activeUser || activeUser.accessLevel !== 1) return;
    if (user.id === activeUser.id) { showToast("Você não pode alterar seu próprio nível.", "error"); return; }
    const newLevel = user.access_level === 1 ? 2 : 1;
    if (window.confirm(newLevel === 1 ? `Promover ${user.nome_operador} a ADMIN (Nível 1)?` : `Remover acesso ADMIN de ${user.nome_operador} (Nível 2)?`)) {
        const { error } = await supabase.from('perfis').update({ access_level: newLevel }).eq('id', user.id);
        if (error) showToast("Erro na operação.", "error"); else { showToast("Permissões atualizadas.", "success"); fetchAllUsers(); }
    }
  };

  const handleAdminResetPassword = async (user: any) => {
      if (!activeUser || activeUser.accessLevel !== 1) return;
      const newPass = prompt(`Digite a nova senha para ${user.nome_operador}:`);
      if (newPass && newPass.trim().length > 0) {
          const { error } = await supabase.from('perfis').update({ senha_acesso: newPass }).eq('id', user.id);
          if (error) showToast("Erro ao redefinir senha.", "error"); else showToast("Senha redefinida com sucesso!", "success");
      }
  };

  const handleMasterUpdateUser = async () => {
      if (!activeUser || !ui.masterEditUser || activeUser.accessLevel !== 1) return;
      const updates: any = { nome_operador: ui.masterEditUser.nome_operador, nome_empresa: ui.masterEditUser.nome_empresa, pix_key: ui.masterEditUser.pix_key, access_level: ui.masterEditUser.access_level };
      if (ui.masterEditUser.newPassword && ui.masterEditUser.newPassword.trim().length > 0) updates.senha_acesso = ui.masterEditUser.newPassword;
      const { error } = await supabase.from('perfis').update(updates).eq('id', ui.masterEditUser.id);
      if (error) { showToast("Erro ao atualizar usuário.", "error"); } else { showToast("Usuário atualizado!", "success"); ui.setMasterEditUser(null); fetchAllUsers(); }
  };

  return {
    handleToggleAdmin,
    handleAdminResetPassword,
    handleMasterUpdateUser
  };
};