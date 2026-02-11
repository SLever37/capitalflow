
import React, { useState } from 'react';
import { UserPlus, Loader2, Shield, Users, RefreshCw, Layers, AlertCircle, Settings, Plus } from 'lucide-react';
import { useTeamData } from '../features/team/hooks/useTeamData';
import { useTeamInvite } from '../features/team/hooks/useTeamInvite';
import { MemberCard } from '../features/team/components/MemberCard';
import { InviteModal } from '../features/team/components/InviteModal';
import { TeamEditorModal } from '../features/team/components/TeamEditorModal';
import { MemberEditorModal } from '../features/team/components/MemberEditorModal';

export const TeamPage = ({ activeUser, showToast }: any) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isTeamEditorOpen, setIsTeamEditorOpen] = useState(false);
  const [isMemberEditorOpen, setIsMemberEditorOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  
  // Flag para saber se estamos editando um time existente ou criando novo
  const [editingTeam, setEditingTeam] = useState<any>(null);

  // Hook de Dados
  const { teams, activeTeam, setActiveTeam, members, loading, refresh, actions } = useTeamData(activeUser?.id);
  
  const { createInvite, isProcessing, inviteResult, resetInviteState, deleteMember } = useTeamInvite({
    teamId: activeTeam?.id,
    onSuccess: refresh,
    showToast
  });

  const handleOpenTeamEditor = (isNew: boolean) => {
      setEditingTeam(isNew ? null : activeTeam);
      setIsTeamEditorOpen(true);
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
      } catch (e: any) {
          showToast(e.message, "error");
      }
  };

  const handleDeleteTeam = async () => {
      if (!editingTeam) return;
      try {
          await actions.deleteTeam(editingTeam.id);
          showToast("Equipe excluída.", "success");
      } catch (e: any) {
          showToast("Erro ao excluir: " + e.message, "error");
      }
  };

  const handleOpenMemberEditor = (member: any) => {
      setEditingMember(member);
      setIsMemberEditorOpen(true);
  };

  const handleSaveMember = async (memberId: string, updates: any) => {
      try {
          await actions.updateMember(memberId, updates);
          showToast("Membro atualizado!", "success");
      } catch (e: any) {
          showToast("Erro ao atualizar membro: " + e.message, "error");
      }
  };

  if (loading && teams.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-xs font-black uppercase tracking-widest animate-pulse">Consultando Banco de Dados...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header & Seletor de Equipe */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
        <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-900/20">
                <Shield size={28} />
            </div>
            <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tighter leading-none">Gestão de Time</h2>
                
                <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 group focus-within:border-blue-500/50 transition-colors">
                        <Layers size={10} className="text-blue-500"/>
                        <select 
                            value={activeTeam?.id || ''} 
                            onChange={(e) => setActiveTeam(teams.find(t => t.id === e.target.value))}
                            className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer hover:text-blue-400 transition-colors"
                        >
                            {teams.length === 0 ? (
                                <option>Nenhuma Equipe Listada</option>
                            ) : (
                                teams.map(t => (
                                    <option key={t.id} value={t.id} className="bg-slate-900 text-white font-bold">{t.name}</option>
                                ))
                            )}
                        </select>
                    </div>

                    <button 
                        onClick={() => handleOpenTeamEditor(false)} 
                        disabled={!activeTeam}
                        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                        title="Configurar Equipe Atual"
                    >
                        <Settings size={14} />
                    </button>
                    
                    <button 
                        onClick={() => handleOpenTeamEditor(true)} 
                        className="p-1.5 text-slate-500 hover:text-emerald-500 hover:bg-slate-800 rounded-lg transition-all"
                        title="Criar Nova Equipe"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
            <button 
                onClick={refresh}
                disabled={loading}
                className={`p-4 bg-slate-800 text-slate-400 rounded-2xl border border-slate-700 hover:text-white transition-all active:scale-95 ${loading ? 'animate-spin' : ''}`}
                title="Sincronizar Manualmente"
            >
                <RefreshCw size={18} />
            </button>
            <button 
                onClick={() => { resetInviteState(); setIsInviteModalOpen(true); }} 
                className="flex-1 sm:flex-none px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
                <UserPlus size={18} /> Novo Membro
            </button>
        </div>
      </div>

      {/* Alerta de Contexto */}
      {teams.length > 0 && members.length === 0 && !loading && (
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-center gap-3 text-blue-400">
              <AlertCircle size={18}/>
              <p className="text-[10px] font-black uppercase">A equipe "{activeTeam?.name}" está ativa mas sem membros configurados.</p>
          </div>
      )}

      {/* Grid de Membros */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teams.length === 0 ? (
            <div className="col-span-full py-24 flex flex-col items-center justify-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem]">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Users size={32} className="text-slate-600"/>
                </div>
                <p className="text-slate-500 font-bold uppercase text-xs">Nenhuma equipe encontrada.</p>
                <button onClick={() => handleOpenTeamEditor(true)} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-700">Criar Primeira Equipe</button>
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

      <InviteModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onGenerate={createInvite}
        isLoading={isProcessing}
        result={inviteResult}
        resetResult={resetInviteState}
      />

      <TeamEditorModal
        isOpen={isTeamEditorOpen}
        onClose={() => setIsTeamEditorOpen(false)}
        onSave={handleSaveTeam}
        onDelete={editingTeam ? handleDeleteTeam : undefined}
        initialName={editingTeam?.name}
        isEditing={!!editingTeam}
      />

      <MemberEditorModal
        isOpen={isMemberEditorOpen}
        onClose={() => setIsMemberEditorOpen(false)}
        member={editingMember}
        teams={teams}
        onSave={handleSaveMember}
      />
    </div>
  );
};
