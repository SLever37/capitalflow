import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';

/* helpers */
const isUUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const safeUUID = (v: any) => (isUUID(v) ? v : null);

export const useAdminController = (
  activeUser: UserProfile | null,
  ui: any,
  fetchAllUsers: () => Promise<void>,
  showToast: (msg: string, type?: 'success' | 'error') => void
) => {
  const getOwnerId = (u: UserProfile) => safeUUID((u as any).supervisor_id) || safeUUID(u.id);

  // ✅ garante que o admin só mexe nos perfis do próprio "dono"
  const assertSameOwner = (targetUser: any) => {
    const ownerId = activeUser ? getOwnerId(activeUser) : null;
    if (!ownerId) throw new Error('OwnerId inválido. Refaça login.');

    // Regra: um "user" pertence a um owner quando:
    // - ele é o próprio dono (id === ownerId), ou
    // - ele tem supervisor_id === ownerId
    const targetId = safeUUID(targetUser?.id);
    const targetSupervisorId = safeUUID(targetUser?.supervisor_id);

    const ok = !!targetId && (targetId === ownerId || targetSupervisorId === ownerId);
    if (!ok) throw new Error('Ação bloqueada: usuário fora do seu grupo.');
    return ownerId;
  };

  const handleToggleAdmin = async (user: any) => {
    if (!activeUser || activeUser.accessLevel !== 1) return;

    try {
      const ownerId = assertSameOwner(user);

      if (user.id === activeUser.id) {
        showToast('Você não pode alterar seu próprio nível.', 'error');
        return;
      }

      const newLevel = user.access_level === 1 ? 2 : 1;

      const ok = window.confirm(
        newLevel === 1
          ? `Promover ${user.nome_operador} a ADMIN (Nível 1)?`
          : `Remover acesso ADMIN de ${user.nome_operador} (Nível 2)?`
      );
      if (!ok) return;

      // ✅ update limitado ao owner
      const { error } = await supabase
        .from('perfis')
        .update({ access_level: newLevel })
        .eq('id', user.id)
        .or(`id.eq.${ownerId},supervisor_id.eq.${ownerId}`);

      if (error) showToast('Erro na operação: ' + error.message, 'error');
      else {
        showToast('Permissões atualizadas.', 'success');
        fetchAllUsers();
      }
    } catch (e: any) {
      showToast(e?.message || 'Falha ao atualizar permissões.', 'error');
    }
  };

  const handleAdminResetPassword = async (user: any) => {
    ui.setMasterEditUser(user);
    // Removed MASTER_EDIT_USER call
  };

  const handleMasterUpdateUser = async (updatedData: any) => {
    if (!activeUser || activeUser.accessLevel !== 1) return;

    const targetUser = updatedData || ui.masterEditUser;
    if (!targetUser) return;

    try {
      const ownerId = assertSameOwner(targetUser);

      const updates: any = {
        nome_operador: targetUser.nome_operador,
        usuario_email: targetUser.usuario_email,
        nome_empresa: targetUser.nome_empresa,
        pix_key: targetUser.pix_key,
        access_level: targetUser.access_level,
      };

      if (targetUser.newPassword && targetUser.newPassword.trim().length > 0) {
        updates.senha_acesso = targetUser.newPassword.trim();
      }

      // ✅ update limitado ao owner
      const { error } = await supabase
        .from('perfis')
        .update(updates)
        .eq('id', targetUser.id)
        .or(`id.eq.${ownerId},supervisor_id.eq.${ownerId}`);

      if (error) {
        showToast('Erro ao atualizar usuário: ' + error.message, 'error');
      } else {
        showToast('Usuário atualizado com sucesso!', 'success');
        ui.setMasterEditUser(null);
        ui.closeModal();
        fetchAllUsers();
      }
    } catch (e: any) {
      showToast(e?.message || 'Falha ao atualizar usuário.', 'error');
    }
  };

  return {
    handleToggleAdmin,
    handleAdminResetPassword,
    handleMasterUpdateUser,
  };
};