
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
      // 1. BUSCA DE EQUIPES: Filtra pelo dono atual
      const { data: allTeams, error: tErr } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_profile_id', activeUserId)
        .order('name', { ascending: true });

      if (tErr) throw tErr;
      
      const teamsList = allTeams || [];
      setTeams(teamsList);
      
      // Define a equipe ativa (Mantém a atual se ainda existir, senão pega a primeira)
      let current = activeTeam ? teamsList.find(t => t.id === activeTeam.id) : null;
      if (!current && teamsList.length > 0) {
          current = teamsList[0];
      }
      setActiveTeam(current);

      if (current) {
        // 2. BUSCA DE MEMBROS: Left Join para trazer Erison (mesmo sem profile_id)
        // Garantimos que filtramos por team_id
        const { data: m, error: mErr } = await supabase
          .from('team_members')
          .select(`
            *,
            linked_profile:profile_id (
                avatar_url,
                usuario_email,
                last_active_at
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
      console.error("Erro na Gestão de Time:", err);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, activeTeam?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CRUD DE UNIDADES (EQUIPES)
  const createTeam = async (name: string) => {
      const id = generateUUID();
      const { data, error } = await supabase
        .from('teams')
        .insert([{ id, name, owner_profile_id: activeUserId }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Define como ativo e recarrega
      setActiveTeam(data);
      await loadData();
      return data;
  };

  const updateTeam = async (id: string, name: string) => {
      const { error } = await supabase.from('teams').update({ name }).eq('id', id).eq('owner_profile_id', activeUserId);
      if (error) throw error;
      await loadData();
  };

  const deleteTeam = async (id: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', id).eq('owner_profile_id', activeUserId);
      if (error) throw error;
      setActiveTeam(null);
      await loadData();
  };

  const moveMember = async (memberId: string, newTeamId: string) => {
      // O membro pode ser movido entre equipes do mesmo dono
      const { error } = await supabase.from('team_members').update({ team_id: newTeamId }).eq('id', memberId);
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
    createTeam,
    updateTeam,
    deleteTeam,
    moveMember
  };
};
