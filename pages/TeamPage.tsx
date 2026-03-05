import React, { useState, useEffect } from 'react';
import { UserPlus, Loader2, Shield, Users, RefreshCw, Layers, AlertCircle, Settings, Plus, BrainCircuit, ShieldAlert, Key, Fingerprint } from 'lucide-react';
import { useTeamData } from '../features/team/hooks/useTeamData';
import { useTeamInvite } from '../features/team/hooks/useTeamInvite';
import { MemberCard } from '../features/team/components/MemberCard';
import { InviteModal } from '../features/team/components/InviteModal';
import { TeamEditorModal } from '../features/team/components/TeamEditorModal';
import { MemberEditorModal } from '../features/team/components/MemberEditorModal';
import { TeamAIInsight } from '../features/team/components/TeamAIInsight';
import { isDev } from '../utils/isDev';
import { supabase } from '../lib/supabase';

export const TeamPage = ({ activeUser, showToast, ui }: any) => {
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);

  const { teams, activeTeam, setActiveTeam, members, loading, fetchError, refresh, actions } = useTeamData(activeUser?.id);
  
  const { createInvite, isProcessing, inviteResult, resetInviteState, deleteMember } = useTeamInvite({
    teamId: activeTeam?.id,
    onSuccess: refresh,
    showToast
  });

  // Diagnóstico de Sessão para Auditoria (Apenas DEV)
  useEffect(() => {
    if (!isDev) return;
    const checkAuth = async () => {
        try {
            const { data } = await supabase.auth.getSession();
            const session = data?.session;
            setAuthStatus({
                authenticated: !!session,
                uid: session?.user?.id || 'null',
                email: session?.user?.email || 'null'
            });
        } catch (e) {
            if (isDev) console.error('[TEAM] Auth check failed:', e);
            setAuthStatus({ authenticated: false, uid: 'error', email: 'error' });
        }
    };
    checkAuth();
  }, []);

  const handleOpenTeamEditor = (isNew: boolean) => {
      setEditingTeam(isNew ? null : activeTeam);
      ui.openModal('TEAM_EDITOR');
  };

  const handleSaveTeam = async (name: string) => {
      try {
          if (editingTeam) {
              await actions.updateTeam(editingTeam.id, name);
              showToast("Equipe renomeada!", "success");
          } else {
              const newTeam = await actions.createTeam(name);
              if (newTeam) setActiveTeam(newTeam);
              showToast("Equipe criada com sucesso!", "success");
          }
          ui.closeModal();
      } catch (e: any) {
          showToast(e.message, "error");
      }
  };

  const handleDeleteTeam = async () => {
      if (!editingTeam) return;
      try {
          await actions.deleteTeam(editingTeam.id);
          showToast("Equipe excluída.", "success");
          ui.closeModal();
      } catch (e: any) {
          showToast("Erro ao excluir: " + e.message, "error");
      }
  };

  const handleOpenMemberEditor = (member: any) => {
      setEditingMember(member);
      ui.openModal('MEMBER_EDITOR');
  };

  const handleSaveMember = async (memberId: string, updates: any) => {
      try {
          await actions.updateMember(memberId, updates);
          showToast("Membro atualizado!", "success");
          ui.closeModal();
      } catch (e: any) {
          showToast("Erro ao atualizar membro: " + e.message, "error");
      }
  };

  if (loading && teams.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-xs font-black uppercase tracking-widest animate-pulse">Sincronizando Time...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8 pb-20 max-w-7xl mx-auto">
      
      {/* Banner de Diagnóstico (DEV ONLY) */}
      {isDev && authStatus && (
        <div className="bg-slate-900 border border-blue-500/30 p-3 rounded-2xl flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1 text-slate-500"><Key size={10} className={authStatus.authenticated ? 'text-emerald-500' : 'text-rose-500'}/> Auth: {authStatus.authenticated ? 'Ativo' : 'Inativo'}</span>
                <span className="text-slate-600 truncate max-w-[150px]">UID: {authStatus.uid}</span>
                <span className="text-slate-600">Email: {authStatus.email}</span>
            </div>
            <button onClick={() => refresh()} className="text-[9px] font-black text-blue-500 hover:text-white uppercase flex items-center gap-1">
                <RefreshCw size={10}/> Forçar Refresh
            </button>
        </div>
      )}

      {/* Alerta de Erro Crítico (RLS ou Banco) */}
      {fetchError && (
        <div className="bg-rose-950/20 border border-rose-500/50 p-6 rounded-[2rem] flex items-start gap-4 animate-in slide-in-from-top-4">
           <ShieldAlert className="text-rose-500 shrink-0" size={32}/>
           <div className="flex-1">
              <h3 className="text-white font-black uppercase text-sm">Falha de Integridade</h3>
              <p className="text-rose-200 text-xs mt-1 leading-relaxed">{fetchError}</p>
              <button onClick={() => refresh()} className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-rose-500 shadow-lg">Reconectar ao Banco</button>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6 bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="p-3 sm:p-4 bg-blue-600 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-blue-900/20 shrink-0">
                <Shield size={24} className="sm:w-7 sm:h-7" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl font-black uppercase text-white tracking-tighter leading-none truncate">Gestão de Time</h2>
                
                <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-800 min-w-0 flex-1 sm:flex-none">
                        <Layers size={10} className="text-blue-500 shrink-0"/>
                        <select 
                            value={activeTeam?.id || ''} 
                            onChange={(e) => setActiveTeam(teams.find(t => t.id === e.target.value))}
                            className="bg-transparent text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer hover:text-blue-400 transition-colors w-full truncate"
                        >
                            {teams.length === 0 ? (
                                <option>Nenhuma Equipe</option>
                            ) : (
                                teams.map(t => (
                                    <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.name}</option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleOpenTeamEditor(false)} disabled={!activeTeam} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><Settings size={14} /></button>
                        <button onClick={() => handleOpenTeamEditor(true)} className="p-1.5 text-slate-500 hover:text-emerald-500 hover:bg-slate-800 rounded-lg transition-all"><Plus size={14} /></button>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex gap-2 w-full lg:w-auto">
            <button onClick={refresh} disabled={loading} className={`p-3 sm:p-4 bg-slate-800 text-slate-400 rounded-xl sm:rounded-2xl border border-slate-700 hover:text-white transition-all active:scale-95 ${loading ? 'animate-spin' : ''}`}><RefreshCw size={18} /></button>
            <button onClick={() => ui.openModal('INVITE')} className="flex-1 lg:flex-none px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95"><UserPlus size={18} /> Novo Membro</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem]">
                        <Users size={32} className="text-slate-600 mb-4"/>
                        <p className="text-slate-500 font-bold uppercase text-xs">Nenhuma equipe encontrada.</p>
                        <button onClick={() => handleOpenTeamEditor(true)} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-700">Criar Primeira Equipe</button>
                    </div>
                ) : members.length === 0 && !loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-900/30 border border-slate-800 rounded-[3rem] text-center px-6">
                        <Users size={40} className="text-slate-700 mb-4"/>
                        <h4 className="text-white font-black uppercase text-sm mb-1">Equipe Vazia</h4>
                        <p className="text-slate-500 text-xs font-medium max-w-xs mx-auto">Não há membros registrados ou o acesso está bloqueado por políticas de segurança.</p>
                        <button onClick={refresh} className="mt-6 flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase"><RefreshCw size={12}/> Tentar Atualizar</button>
                    </div>
                ) : (
                    members.map((member) => (
                        <MemberCard 
                            key={member.id} 
                            member={member} 
                            onDelete={deleteMember} 
                            onEdit={handleOpenMemberEditor}
                        />
                    ))
                )}
              </div>
          </div>

          <div className="lg:col-span-4">
              <TeamAIInsight members={members} teamName={activeTeam?.name} />
          </div>
      </div>

      {ui.activeModal?.type === 'INVITE' && (
        <InviteModal isOpen={true} onClose={ui.closeModal} onGenerate={createInvite} isLoading={isProcessing} result={inviteResult} resetResult={resetInviteState} />
      )}
      {ui.activeModal?.type === 'TEAM_EDITOR' && (
          <TeamEditorModal isOpen={true} onClose={ui.closeModal} onSave={handleSaveTeam} onDelete={editingTeam ? handleDeleteTeam : undefined} initialName={editingTeam?.name} isEditing={!!editingTeam} />
      )}
      {ui.activeModal?.type === 'MEMBER_EDITOR' && (
          <MemberEditorModal 
            isOpen={true} 
            onClose={ui.closeModal} 
            member={{...editingMember, team_members: members}} 
            teams={teams} 
            onSave={handleSaveMember} 
          />
      )}
    </div>
  );
};