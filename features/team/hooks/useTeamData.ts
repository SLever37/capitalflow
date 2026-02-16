import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { generateUUID } from '../../../utils/generators';
import { isDev } from '../../../utils/isDev';

export const useTeamData = (activeUserId: string | null | undefined) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTeam, setActiveTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!activeUserId || activeUserId === 'DEMO') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1) Busca todas as equipes disponíveis (baseado em RLS ou owner)
      const { data: allTeams, error: tErr } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

      if (tErr) throw tErr;

      const teamsList = allTeams || [];
      setTeams(teamsList);

      // Define equipe ativa baseada na seleção anterior ou padrão
      let current = activeTeam;
      if (!current || !teamsList.find((t) => t.id === current.id)) {
        // Tenta achar a equipe padrão "CapitalFlow" ou pega a primeira disponível
        const capitalFlow = teamsList.find((t) => t.name === 'CapitalFlow');
        current = capitalFlow || teamsList[0] || null;
        setActiveTeam(current);
      }

      if (isDev && current) {
        console.log('[TEAM] ownerId', activeUserId, 'teamId', current.id);
      }

      // 2) Busca Membros COM JOIN em perfis para trazer dados reais (Ex: Cassia)
      if (current) {
        const { data: m, error: mErr } = await supabase
          .from('team_members')
          .select(`
            *,
            linked_profile:profile_id (
              id,
              nome_completo,
              nome_operador,
              usuario_email,
              avatar_url,
              phone,
              access_level,
              last_active_at,
              access_count,
              supervisor_id
            )
          `)
          .eq('team_id', current.id)
          .order('full_name', { ascending: true });

        if (mErr) {
          console.error('[TEAM] Erro ao buscar membros:', mErr);
          throw mErr;
        }

        if (isDev) {
          console.log('[TEAM] members_raw', m);
        }

        // 3) Tratamento de fallback e normalização
        const normalizedMembers = (m || []).map(member => {
            // Se o membro já aceitou (tem linked_profile), garantimos que os dados
            // do perfil do banco sobreponham os dados estáticos do convite
            if (member.linked_profile) {
                return {
                    ...member,
                    full_name: member.linked_profile.nome_completo || member.full_name,
                    username_or_email: member.linked_profile.usuario_email || member.username_or_email
                };
            }
            return member;
        });

        if (isDev) {
            console.log('[TEAM] members_final', normalizedMembers);
        }

        setMembers(normalizedMembers);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('Erro crítico na Gestão de Time:', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, activeTeam?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- ACTIONS ---

  const createTeam = async (name: string) => {
    if (!activeUserId) return;
    const { data, error } = await supabase
      .from('teams')
      .insert({
        id: generateUUID(),
        owner_profile_id: activeUserId,
        name: name.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    await loadData();
    return data;
  };

  const updateTeam = async (teamId: string, name: string) => {
    const { error } = await supabase
      .from('teams')
      .update({ name: name.trim() })
      .eq('id', teamId);
    if (error) throw error;
    await loadData();
  };

  const deleteTeam = async (teamId: string) => {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);
    if (error) throw error;
    setActiveTeam(null);
    await loadData();
  };

  const updateMember = async (memberId: string, updates: { role?: string; team_id?: string; profile_id?: string | null }) => {
    const { error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', memberId);
    if (error) throw error;
    await loadData();
  };

  return {
    teams,
    activeTeam,
    setActiveTeam,
    members,
    loading,
    refresh: loadData,
    actions: {
      createTeam,
      updateTeam,
      deleteTeam,
      updateMember,
    },
  };
};