
import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  UserPlus,
  User,
  Palette,
  Image as ImageIcon,
  ShieldCheck,
  Copy,
  Trash2,
  Loader2,
  Save,
  Users,
  UserCheck,
  Link as LinkIcon,
} from 'lucide-react';
import { UserProfile, CapitalSource } from '../types';
import { formatMoney } from '../utils/formatters';
import { supabase } from '../lib/supabase';
import { generateUUID } from '../utils/generators';

interface TeamPageProps {
  activeUser: UserProfile | null;
  staffMembers: UserProfile[]; // mantido por compatibilidade
  sources: CapitalSource[]; // mantido por compatibilidade
  showToast: (msg: string, type?: any) => void;
  onRefresh: () => void;
}

type TeamRow = {
  id: string;
  owner_profile_id: string;
  name: string;
  created_at: string;
};

type TeamInviteRow = {
  id: string;
  team_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
};

type TeamMemberRow = {
  id: string;
  team_id: string;
  full_name: string;
  cpf: string;
  username_or_email: string;
  linked_profile_id: string | null;
  created_at: string;
};

export const TeamPage: React.FC<TeamPageProps> = ({
  activeUser,
  showToast,
  onRefresh,
}) => {
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [memberName, setMemberName] = useState(''); // só pra você identificar ao gerar o link
  const [inviteLink, setInviteLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [team, setTeam] = useState<TeamRow | null>(null);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [invites, setInvites] = useState<TeamInviteRow[]>([]);

  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);

  const ownerId = activeUser?.id ?? null;

  const canUse = useMemo(() => !!ownerId, [ownerId]);

  const loadTeamData = async () => {
    if (!ownerId) return;

    // 1) Pega a equipe do dono (se tiver mais de uma, pega a mais recente)
    const { data: teams, error: teamErr } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_profile_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (teamErr) {
      // Se der erro 404/tabela não existe, avisa suavemente
      console.error("Erro ao carregar equipe:", teamErr);
      return;
    }

    const t = teams?.[0] ?? null;
    setTeam(t);

    if (!t) {
      setMembers([]);
      setInvites([]);
      return;
    }

    // 2) Lista membros
    const { data: m, error: memErr } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', t.id)
      .order('created_at', { ascending: false });

    if (memErr) {
      showToast('Falha ao carregar membros: ' + memErr.message, 'error');
      return;
    }
    setMembers(m ?? []);

    // 3) Lista convites ativos (pra controle)
    const { data: i, error: invErr } = await supabase
      .from('team_invites')
      .select('*')
      .eq('team_id', t.id)
      .order('created_at', { ascending: false });

    if (invErr) {
      showToast('Falha ao carregar convites: ' + invErr.message, 'error');
      return;
    }
    setInvites(i ?? []);
  };

  useEffect(() => {
    loadTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const handleCreateTeamIfMissing = async () => {
    if (!ownerId) return;

    setIsSaving(true);
    try {
      const teamName = (activeUser?.businessName || activeUser?.name || 'Minha Equipe').trim();

      const { data, error } = await supabase
        .from('teams')
        .insert({
          owner_profile_id: ownerId,
          name: teamName,
        })
        .select('*')
        .single();

      if (error) throw error;

      setTeam(data as TeamRow);
      showToast('Equipe criada!', 'success');
      onRefresh();
      await loadTeamData();
    } catch (e: any) {
      showToast('Falha ao criar equipe (verifique se rodou o SQL): ' + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!ownerId) return;

    if (!team) {
      showToast('Você ainda não tem equipe. Crie a equipe primeiro.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const token = generateUUID();

      const { error } = await supabase.from('team_invites').insert({
        team_id: team.id,
        token,
        is_active: true,
      });

      if (error) throw error;

      const url = `${window.location.origin}/?invite_token=${token}`;
      setInviteLink(url);
      setIsCreatingInvite(false);
      setMemberName('');
      showToast('Convite criado! Envie o link.', 'success');

      onRefresh();
      await loadTeamData();
    } catch (e: any) {
      showToast('Erro ao gerar convite: ' + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      showToast('Link copiado!', 'success');
    } catch (err) {
      const input = document.getElementById('invite-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        showToast('Link copiado!', 'success');
      }
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!team) return;

    if (!confirm('Revogar este convite?')) return;

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('team_invites')
        .update({ is_active: false, revoked_at: now })
        .eq('id', inviteId);

      if (error) throw error;

      showToast('Convite revogado.', 'success');
      onRefresh();
      await loadTeamData();
    } catch (e: any) {
      showToast('Erro ao revogar: ' + e.message, 'error');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!team) return;

    if (!confirm('Remover este membro da equipe?')) return;

    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);
      if (error) throw error;

      showToast('Membro removido.', 'success');
      onRefresh();
      await loadTeamData();
    } catch (e: any) {
      showToast('Erro ao remover: ' + e.message, 'error');
    }
  };

  // Mantive seu modal de “Gestão de Unidade” porque ele existe no app,
  // mas agora ele edita o branding no UserProfile, não no membro da equipe (que é apenas um link).
  const handleSaveStaffBranding = async () => {
    if (!editingStaff) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('perfis')
        .update({
          nome_empresa: editingStaff.businessName,
          brand_color: editingStaff.brandColor,
          logo_url: editingStaff.logoUrl,
          interest_balance: editingStaff.interestBalance,
        })
        .eq('id', editingStaff.id);

      if (error) throw error;

      showToast('Unidade atualizada!', 'success');
      setEditingStaff(null);
      onRefresh();
    } catch (e: any) {
      showToast('Erro ao salvar: ' + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            <Briefcase className="text-blue-500" size={28} /> Minha Equipe
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Gestão de Equipes e Acessos
          </p>
          {team ? (
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">
              Equipe ativa: <span className="text-white">{team.name}</span>
            </p>
          ) : (
            <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mt-2">
              Você ainda não tem uma equipe criada.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {!team ? (
            <button
              onClick={handleCreateTeamIfMissing}
              disabled={!canUse || isSaving}
              className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <UserCheck size={16} />}
              Criar Minha Equipe
            </button>
          ) : (
            <button
              onClick={() => {
                setInviteLink('');
                setMemberName('');
                setIsCreatingInvite(true);
              }}
              disabled={!canUse}
              className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <UserPlus size={16} /> Adicionar Membro
            </button>
          )}
        </div>
      </div>

      {inviteLink && (
        <div className="bg-emerald-900/20 border border-emerald-500/30 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-in zoom-in-95">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-lg">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-emerald-400 font-bold text-sm">Link de Acesso Gerado</p>
              <p className="text-[10px] text-slate-400 font-black uppercase">
                Envie este link para o novo membro se cadastrar.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <input
              id="invite-input"
              readOnly
              value={inviteLink}
              className="flex-1 md:w-80 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono truncate outline-none focus:border-emerald-500 transition-colors"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              onClick={handleCopyLink}
              className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all shadow-lg active:scale-95 flex items-center gap-2 font-bold text-xs uppercase"
            >
              <Copy size={16} /> Copiar
            </button>
          </div>
        </div>
      )}

      {/* LISTA DE MEMBROS (team_members) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!team ? (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-60">
            <Users className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-300 font-black uppercase text-xs tracking-widest">
              Crie sua equipe para começar a adicionar membros.
            </p>
          </div>
        ) : members.length === 0 ? (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-40">
            <Users className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 font-black uppercase text-xs tracking-widest">
              Nenhum membro ativo. Gere um convite para adicionar pessoas.
            </p>
          </div>
        ) : (
          members.map((m) => {
            // Se linked_profile_id existir, o cadastro foi completado
            const isLinked = !!m.linked_profile_id;

            return (
              <div
                key={m.id}
                className={`bg-slate-900 border p-8 rounded-[3rem] group transition-all relative overflow-hidden ${
                  isLinked ? 'border-slate-800 hover:border-blue-500/50' : 'border-amber-500/30'
                }`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -mr-16 -mt-16"></div>

                {!isLinked && (
                  <div className="absolute top-6 right-6 bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                    Aguardando Cadastro
                  </div>
                )}

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-slate-800 overflow-hidden bg-slate-950">
                    <User size={28} className="text-slate-700" />
                  </div>
                  <button
                    onClick={() => handleDeleteMember(m.id)}
                    className="p-2 bg-slate-800 text-rose-500 hover:bg-rose-900/20 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <h3 className="text-lg font-black text-white uppercase tracking-tight truncate">
                  {m.full_name || 'Membro Convidado'}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">
                  {m.username_or_email}
                </p>

                <div className="space-y-2 pt-6 border-t border-slate-800">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-slate-500 uppercase">CPF</span>
                    <span className="text-xs font-black text-slate-300">{m.cpf || '...'}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-slate-500 uppercase">Acesso</span>
                    <span className={`text-xs font-black ${isLinked ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isLinked ? 'ATIVO' : 'PENDENTE'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* LISTA DE CONVITES (opcional, para controle) */}
      {team && invites.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-8">
          <h3 className="text-sm font-black uppercase text-white tracking-widest mb-4 flex items-center gap-2">
            <LinkIcon size={16} className="text-blue-500" /> Convites Gerados
          </h3>

          <div className="space-y-3">
            {invites.map((i) => {
              const active = i.is_active && !i.revoked_at;
              const url = `${window.location.origin}/?invite_token=${i.token}`;

              return (
                <div
                  key={i.id}
                  className="flex flex-col md:flex-row gap-3 md:items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-4"
                >
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {active ? 'DISPONÍVEL' : 'REVOGADO/USADO'}
                    </p>
                    <p className="text-xs text-slate-300 font-mono truncate">{url}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(url);
                          showToast('Link copiado!', 'success');
                        } catch (e) {
                          showToast('Erro ao copiar.', 'error');
                        }
                      }}
                      className="px-4 py-3 bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] hover:bg-slate-700 transition-all flex items-center gap-2"
                    >
                      <Copy size={14} /> Copiar
                    </button>

                    {active && (
                      <button
                        onClick={() => handleRevokeInvite(i.id)}
                        className="px-4 py-3 bg-rose-600/20 text-rose-300 rounded-xl font-black uppercase text-[10px] hover:bg-rose-600/30 transition-all flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Convite (Gerador) */}
      {isCreatingInvite && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[3rem] p-8 space-y-6 animate-in zoom-in-95 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-xl font-black text-white uppercase">Novo Convite</h2>
              <p className="text-xs text-slate-500 mt-1">Gere um link para adicionar alguém.</p>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-2 block">
                Nome de Referência (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Novo Vendedor"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-colors"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsCreatingInvite(false)}
                className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px] hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateInvite}
                disabled={isSaving}
                className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Gerar Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
