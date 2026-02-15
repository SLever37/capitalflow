import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { generateUUID } from '../../../utils/generators';

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
      const { data: allTeams, error: tErr } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

      if (tErr) throw tErr;
      const teamsList = allTeams || [];
      setTeams(teamsList);

      let current = activeTeam;
      if (!current || !teamsList.find((t) => t.id === current.id)) {
        const capitalFlow = teamsList.find((t) => t.name === 'CapitalFlow');
        current = capitalFlow || teamsList[0] || null;
        setActiveTeam(current);
      }

      if (current) {
        // Realiza join com perfis para pegar dados de acesso (v3 schema)
        const { data: m, error: mErr } = await supabase
          .from('team_members')
          .select(`
            *,
            linked_profile:linked_profile_id (
              id,
              last_active_at,
              access_count,
              avatar_url,
              usuario_email,
              supervisor_id
            )
          `)
          .eq('team_id', current.id)
          .order('full_name', { ascending: true });

        if (mErr) throw mErr;
        setMembers(m || []);
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
    const { error } = await supabase.from('teams').update({ name: name.trim() }).eq('id', teamId);
    if (error) throw error;
    await loadData();
  };

  const deleteTeam = async (teamId: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) throw error;
    setActiveTeam(null);
    await loadData();
  };

  const updateMember = async (memberId: string, updates: any) => {
    const { error } = await supabase.from('team_members').update(updates).eq('id', memberId);
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