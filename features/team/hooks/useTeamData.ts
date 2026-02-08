
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

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
      // 1. Busca simplificada de Equipes para depurar RLS
      const { data: allTeams, error: tErr } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

      if (tErr) throw tErr;
      
      const teamsList = allTeams || [];
      setTeams(teamsList);
      
      // Define a equipe ativa inicial
      let current = activeTeam;
      if (!current && teamsList.length > 0) {
          // Tenta encontrar a equipe "CapitalFlow" mencionada no CSV
          const capitalFlow = teamsList.find(t => t.name === 'CapitalFlow');
          current = capitalFlow || teamsList[0];
          setActiveTeam(current);
      }

      if (current) {
        // 2. Busca Membros (QUERY SEM FILTRO DE JOIN)
        // Buscamos exatamente como está no seu CSV, permitindo profile_id nulo
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
      }
    } catch (err) {
      console.error("Erro crítico na Gestão de Time:", err);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, activeTeam?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { 
    teams, 
    activeTeam, 
    setActiveTeam, 
    members, 
    loading, 
    refresh: loadData 
  };
};
