
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
      // Deprecado em favor do modal completo, mas mantido como fallback se chamado diretamente
      ui.setMasterEditUser(user);
      ui.openModal('MASTER_EDIT_USER');
  };

  const handleMasterUpdateUser = async (updatedData: any) => {
      if (!activeUser || activeUser.accessLevel !== 1) return;
      
      const targetUser = updatedData || ui.masterEditUser;
      if (!targetUser) return;

      const updates: any = { 
          nome_operador: targetUser.nome_operador, 
          usuario_email: targetUser.usuario_email,
          nome_empresa: targetUser.nome_empresa, 
          pix_key: targetUser.pix_key, 
          access_level: targetUser.access_level 
      };
      
      if (targetUser.newPassword && targetUser.newPassword.trim().length > 0) {
          updates.senha_acesso = targetUser.newPassword.trim();
      }
      
      const { error } = await supabase.from('perfis').update(updates).eq('id', targetUser.id);
      
      if (error) { 
          showToast("Erro ao atualizar usuário: " + error.message, "error"); 
      } else { 
          showToast("Usuário atualizado com sucesso!", "success"); 
          ui.setMasterEditUser(null); 
          ui.closeModal();
          fetchAllUsers(); 
      }
  };

  return {
    handleToggleAdmin,
    handleAdminResetPassword,
    handleMasterUpdateUser
  };
};
