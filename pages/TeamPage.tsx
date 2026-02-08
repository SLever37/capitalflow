
import React, { useState } from 'react';
import { Loader2, Users, Check } from 'lucide-react';
import { useTeamData } from '../features/team/hooks/useTeamData';
import { useTeamInvite } from '../features/team/hooks/useTeamInvite';
import { Modal } from '../components/ui/Modal';
import { InviteModal } from '../features/team/components/InviteModal';
import { TeamUnitHeader } from '../features/team/components/TeamUnitHeader';
import { MemberCard } from '../features/team/components/MemberCard';

export const TeamPage = ({ activeUser, showToast }: any) => {
  const { 
      teams, activeTeam, setActiveTeam, members, loading, refresh, 
      createTeam, updateTeam, deleteTeam, moveMember 
  } = useTeamData(activeUser?.id);
  
  const { createInvite, isProcessing, inviteResult, resetInviteState, deleteMember } = useTeamInvite({ 
      teamId: activeTeam?.id, 
      onSuccess: refresh, 
      showToast 
  });

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');

  if (loading && teams.length === 0) return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500 gap-4">
      <Loader2 className="animate-spin text-blue-500" size={40} />
      <p className="text-xs font-black uppercase tracking-widest animate-pulse">Sincronizando Unidades...</p>
    </div>
  );

  const handleCreateTeam = async () => {
    if (!newName.trim()) return;
    try {
        await createTeam(newName);
        showToast("Unidade criada com sucesso!", "success");
        setIsCreateModalOpen(false);
        setNewName('');
    } catch (e: any) {
        showToast("Falha ao criar unidade: " + e.message, "error");
    }
  };

  const handleMoveMember = (mid: string, name: string) => {
    const otherTeams = teams.filter(t => t.id !== activeTeam.id);
    if (otherTeams.length === 0) return alert("Crie outra unidade para poder mover membros.");
    
    const targetId = prompt(`Mover ${name} para qual unidade?\nOpções: ` + otherTeams.map(t => `${t.name}`).join(', '));
    const target = otherTeams.find(t => t.name.toLowerCase() === targetId?.toLowerCase());
    
    if (target) {
        moveMember(mid, target.id).then(() => showToast(`Membro movido para ${target.name}`));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-8 pb-24 max-w-7xl mx-auto animate-in fade-in duration-500">
      <TeamUnitHeader 
        teams={teams} activeTeam={activeTeam} setActiveTeam={setActiveTeam} 
        onEdit={() => { setEditName(activeTeam?.name || ''); setIsEditModalOpen(true); }}
        onDelete={() => confirm(`Excluir a unidade "${activeTeam?.name}" removerá o vínculo de todos os membros. Esta ação não pode ser desfeita. Continuar?`) && deleteTeam(activeTeam.id).then(() => showToast("Unidade removida"))}
        onNewMember={() => { resetInviteState(); setIsInviteModalOpen(true); }}
        onCreate={() => setIsCreateModalOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teams.length === 0 ? (
          <div className="col-span-full py-24 flex flex-col items-center justify-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem]">
            <Users size={48} className="text-slate-800 mb-4" />
            <p className="text-slate-500 font-bold uppercase text-xs">Crie sua primeira unidade de negócio</p>
            <button onClick={() => setIsCreateModalOpen(true)} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Começar agora</button>
          </div>
        ) : members.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-900/30 rounded-[2.5rem] border border-slate-800 border-dashed">
            <Users size={32} className="mx-auto text-slate-800 mb-4" />
            <p className="text-slate-600 font-black uppercase text-xs tracking-widest">Nenhum operador vinculado a "{activeTeam?.name}"</p>
          </div>
        ) : (
          members.map(m => <MemberCard key={m.id} member={m} teams={teams} activeTeam={activeTeam} onMove={handleMoveMember} onDelete={deleteMember} />)
        )}
      </div>

      {/* Modal Criar Unidade */}
      {isCreateModalOpen && (
        <Modal onClose={() => setIsCreateModalOpen(false)} title="Nova Unidade de Negócio">
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Identificação da Unidade</label>
              <input className="w-full bg-transparent text-white font-bold outline-none text-base" placeholder="Ex: Central Manaus, Unidade Sul..." value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            </div>
            <button onClick={handleCreateTeam} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg">
                <Check size={18}/> Confirmar Criação
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Editar Unidade */}
      {isEditModalOpen && (
        <Modal onClose={() => setIsEditModalOpen(false)} title="Configurar Unidade">
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Renomear para</label>
              <input className="w-full bg-transparent text-white font-bold outline-none text-base" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
            </div>
            <button onClick={() => updateTeam(activeTeam.id, editName).then(() => { showToast("Unidade renomeada com sucesso!", "success"); setIsEditModalOpen(false); })} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs">Salvar Alterações</button>
          </div>
        </Modal>
      )}

      <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onGenerate={createInvite} isLoading={isProcessing} result={inviteResult} resetResult={resetInviteState} />
    </div>
  );
};
