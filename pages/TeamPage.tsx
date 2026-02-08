
import React, { useState } from 'react';
import { UserPlus, Loader2, Shield, Users, RefreshCw, Layers, AlertCircle } from 'lucide-react';
import { useTeamData } from '../features/team/hooks/useTeamData';
import { useTeamInvite } from '../features/team/hooks/useTeamInvite';
import { MemberCard } from '../features/team/components/MemberCard';
import { InviteModal } from '../features/team/components/InviteModal';
import { MemberEditModal } from '../features/team/components/MemberEditModal';

export const TeamPage = ({ activeUser, showToast, ui }: any) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  
  // Hook de Dados (Blindado para seu DB)
  const { teams, activeTeam, setActiveTeam, members, loading, refresh } = useTeamData(activeUser?.id);
  
  const { createInvite, isProcessing, inviteResult, resetInviteState, deleteMember, updateMember } = useTeamInvite({
    teamId: activeTeam?.id,
    onSuccess: refresh,
    showToast
  });

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleChatMember = (member: any) => {
    if (ui && ui.openModal) {
        // Abre o chat de suporte com o perfil do membro
        // Aqui simulamos a abertura do chat
        ui.setMessageModalLoan({ id: 'TEAM_CHAT', clientId: member.profile_id, debtorName: member.full_name });
        ui.openModal('MESSAGE_HUB');
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
                <div className="flex items-center gap-2 mt-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
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
                <p className="text-slate-600 text-[10px] mt-2 max-w-xs text-center uppercase font-black">
                   Verifique no seu Supabase se as equipes existem para o seu ID de perfil.
                </p>
            </div>
        ) : (
            members.map((member) => (
                <MemberCard 
                    key={member.id} 
                    member={member} 
                    onDelete={deleteMember} 
                    onEdit={handleEditMember}
                    onChat={handleChatMember}
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

      <MemberEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        member={editingMember}
        teams={teams}
        onSave={updateMember}
        isLoading={isProcessing}
      />
    </div>
  );
};
