
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { generateUUID } from '../../../utils/generators';
import { InviteResult } from '../types';

interface UseTeamInviteProps {
  teamId: string | undefined;
  onSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const useTeamInvite = ({ teamId, onSuccess, showToast }: UseTeamInviteProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  const createInvite = async (name: string, cleanCPF: string) => {
    if (!teamId) {
      showToast("Erro: Time não identificado.", "error");
      return;
    }

    setIsProcessing(true);
    setInviteResult(null);

    try {
      const profileId = generateUUID();
      const inviteToken = generateUUID();

      // 1. Criar perfil "placeholder" (sem senha, apenas para vincular dados)
      // O email fictício garante unicidade temporária até o usuário reclamar a conta
      const { error: pErr } = await supabase.from('profiles').insert({
        id: profileId,
        full_name: name,
        email: `${cleanCPF}@convite.temp`, // Email temporário
      });

      if (pErr) throw new Error("Erro ao criar perfil base: " + pErr.message);

      // 2. Criar o vínculo no time com o token
      const { error: mErr } = await supabase.from('team_members').insert({
        team_id: teamId,
        profile_id: profileId,
        full_name: name,
        cpf: cleanCPF,
        username_or_email: cleanCPF,
        role: 'MEMBER',
        invite_token: inviteToken
      });

      if (mErr) throw new Error("Erro ao adicionar membro: " + mErr.message);

      // Gera link para Login (assumindo que a rota /login aceita ?token=...)
      const inviteLink = `${window.location.origin}/login?invite_token=${inviteToken}`;
      
      setInviteResult({ link: inviteLink, name });
      showToast("Convite gerado com sucesso!", "success");
      onSuccess(); // Recarrega a lista
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro? O acesso será revogado imediatamente.')) return;

    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);
      if (error) throw error;
      
      showToast("Membro removido.", "success");
      onSuccess();
    } catch (e: any) {
      showToast("Erro ao remover: " + e.message, "error");
    }
  };

  const updateMember = async (memberId: string, updates: any) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          full_name: updates.full_name,
          role: updates.role,
          team_id: updates.team_id,
          supervisor_id: updates.supervisor_id || null
        })
        .eq('id', memberId);

      if (error) throw error;
      
      // Se o membro tiver um perfil vinculado, atualiza o supervisor_id no perfil também
      const { data: member } = await supabase
        .from('team_members')
        .select('profile_id')
        .eq('id', memberId)
        .single();

      if (member?.profile_id) {
        await supabase
          .from('perfis')
          .update({ supervisor_id: updates.supervisor_id || null })
          .eq('id', member.profile_id);
      }

      showToast("Membro atualizado com sucesso!", "success");
      onSuccess();
    } catch (e: any) {
      showToast("Erro ao atualizar: " + e.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetInviteState = () => {
    setInviteResult(null);
  };

  return {
    isProcessing,
    inviteResult,
    createInvite,
    deleteMember,
    updateMember,
    resetInviteState
  };
};
