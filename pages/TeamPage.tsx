
import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  UserPlus,
  User,
  ShieldCheck,
  Copy,
  Trash2,
  Loader2,
  Save,
  Users,
  UserCheck,
  Link as LinkIcon,
  KeyRound,
  Eye,
} from 'lucide-react';
import { UserProfile, CapitalSource } from '../types';
import { formatMoney, maskDocument, maskPhone, onlyDigits } from '../utils/formatters';
import { supabase } from '../lib/supabase';
import { generateUUID } from '../utils/generators';
import { Modal } from '../components/ui/Modal';

interface TeamPageProps {
  activeUser: UserProfile | null;
  staffMembers: UserProfile[]; 
  sources: CapitalSource[]; 
  showToast: (msg: string, type?: any) => void;
  onRefresh: () => void;
}

type TeamRow = {
  id: string;
  owner_profile_id: string;
  name: string;
  created_at: string;
};

type TeamMemberRow = {
  id: string;
  team_id: string;
  full_name: string;
  cpf: string;
  username_or_email: string;
  linked_profile_id: string | null;
  created_at: string;
  // Campo virtual vindo do join
  perfis?: {
      access_code: string;
      phone: string;
  };
};

export const TeamPage: React.FC<TeamPageProps> = ({
  activeUser,
  showToast,
  onRefresh,
}) => {
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para Modal de Cadastro/Visualização de Membro
  const [isRegisteringMember, setIsRegisteringMember] = useState(false);
  const [viewingMember, setViewingMember] = useState<TeamMemberRow | null>(null);
  const [newMemberForm, setNewMemberForm] = useState({ name: '', phone: '', cpf: '', code: '' });
  const [generatedCredentials, setGeneratedCredentials] = useState<{cpf: string, code: string, link: string} | null>(null);

  const ownerId = activeUser?.id ?? null;
  const canUse = useMemo(() => !!ownerId, [ownerId]);

  const loadTeamData = async () => {
    if (!ownerId) return;
    setIsLoading(true);

    try {
        // 1) Pega a equipe do dono
        const { data: teams, error: teamErr } = await supabase
          .from('teams')
          .select('*')
          .eq('owner_profile_id', ownerId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (teamErr) return;

        const t = teams?.[0] ?? null;
        setTeam(t);

        if (!t) {
          setMembers([]);
          return;
        }

        // 2) Lista membros incluindo o código de acesso do perfil vinculado
        const { data: m, error: memErr } = await supabase
          .from('team_members')
          .select('*, perfis:linked_profile_id(access_code, phone)')
          .eq('team_id', t.id)
          .order('created_at', { ascending: false });

        if (memErr) {
          showToast('Falha ao carregar membros: ' + memErr.message, 'error');
          return;
        }
        setMembers(m as any ?? []);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [ownerId]);

  const handleCreateTeamIfMissing = async () => {
    if (!ownerId) return;
    setIsSaving(true);
    try {
      const teamName = (activeUser?.businessName || activeUser?.name || 'Minha Equipe').trim();
      const { data, error } = await supabase
        .from('teams')
        .insert({ owner_profile_id: ownerId, name: teamName })
        .select('*')
        .single();

      if (error) throw error;
      setTeam(data as TeamRow);
      showToast('Equipe criada!', 'success');
      onRefresh();
      await loadTeamData();
    } catch (e: any) {
      showToast('Falha ao criar equipe: ' + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openRegisterModal = () => {
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
      setNewMemberForm({ name: '', phone: '', cpf: '', code: randomCode });
      setGeneratedCredentials(null);
      setIsRegisteringMember(true);
  };

  const handleRegisterMember = async () => {
      if (!team || !ownerId) return;
      const { name, phone, cpf, code } = newMemberForm;
      const cleanCPF = onlyDigits(cpf);
      const cleanPhone = onlyDigits(phone);

      if (!name.trim()) { showToast("Nome é obrigatório.", "error"); return; }
      if (cleanCPF.length !== 11) { showToast("CPF inválido (11 dígitos).", "error"); return; }
      if (!code || code.length < 4) { showToast("Código de acesso inválido.", "error"); return; }

      setIsSaving(true);
      try {
          const profileId = generateUUID();
          const dummyEmail = `member.${cleanCPF}@capitalflow.team`; 
          
          const { error: profileError } = await supabase.from('perfis').insert({
              id: profileId,
              supervisor_id: ownerId,
              nome_operador: name.trim(),
              nome_completo: name.trim(),
              email: dummyEmail,
              usuario_email: dummyEmail,
              document: cleanCPF,
              phone: cleanPhone,
              access_code: code,
              senha_acesso: 'NO_PASSWORD',
              access_level: 2, 
              total_available_capital: 0,
              interest_balance: 0,
              created_at: new Date().toISOString()
          });

          if (profileError) throw profileError;

          const { error: memberError } = await supabase.from('team_members').insert({
              team_id: team.id,
              profile_id: profileId,
              linked_profile_id: profileId,
              full_name: name.trim(),
              cpf: cleanCPF,
              username_or_email: cleanCPF,
              role: 'MEMBER'
          });

          if (memberError) throw memberError;

          setGeneratedCredentials({
              cpf: cleanCPF,
              code: code,
              link: window.location.origin
          });
          
          showToast("Membro cadastrado com sucesso!", "success");
          await loadTeamData();

      } catch (e: any) {
          showToast("Erro ao cadastrar: " + e.message, "error");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteMember = async (e: React.MouseEvent, memberId: string, linkedProfileId: string | null) => {
    e.stopPropagation();
    if (!confirm('Remover este membro? O acesso será revogado imediatamente.')) return;
    try {
      await supabase.from('team_members').delete().eq('id', memberId);
      if (linkedProfileId) {
          await supabase.from('perfis').delete().eq('id', linkedProfileId);
      }
      showToast('Membro removido.', 'success');
      await loadTeamData();
    } catch (e: any) {
      showToast('Erro ao remover: ' + e.message, 'error');
    }
  };

  const handleViewCredentials = (member: TeamMemberRow) => {
    setGeneratedCredentials({
        cpf: member.cpf,
        code: member.perfis?.access_code || '----',
        link: window.location.origin
    });
    setViewingMember(member);
    setIsRegisteringMember(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            <Briefcase className="text-blue-500" size={28} /> Minha Equipe
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Gestão de Acessos e Convites
          </p>
        </div>

        <div className="flex gap-2">
          {!team ? (
            <button
              onClick={handleCreateTeamIfMissing}
              disabled={!canUse || isSaving}
              className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <UserCheck size={16} />}
              Criar Equipe
            </button>
          ) : (
            <button
              onClick={openRegisterModal}
              disabled={!canUse}
              className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <UserPlus size={16} /> Cadastrar Membro
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
            <div className="col-span-full py-24 text-center">
                <Loader2 className="animate-spin text-blue-500 mx-auto" size={48} />
                <p className="text-slate-500 text-xs font-black uppercase mt-4 tracking-widest">Sincronizando Colaboradores...</p>
            </div>
        ) : !team ? (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-60">
            <Users className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-300 font-black uppercase text-xs tracking-widest">
              Crie sua equipe para começar.
            </p>
          </div>
        ) : members.length === 0 ? (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-40">
            <Users className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-500 font-black uppercase text-xs tracking-widest">
              Nenhum membro ativo. Cadastre um colaborador.
            </p>
          </div>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              onClick={() => handleViewCredentials(m)}
              className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] group transition-all relative overflow-hidden hover:border-blue-500 cursor-pointer shadow-xl hover:shadow-blue-900/10"
            >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-slate-800 overflow-hidden bg-slate-950 group-hover:bg-blue-600 group-hover:border-blue-500 transition-colors">
                    <User size={28} className="text-slate-700 group-hover:text-white" />
                  </div>
                  <div className="flex gap-2">
                      <button className="p-2 bg-slate-800 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteMember(e, m.id, m.linked_profile_id)}
                        className="p-2 bg-slate-800 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                  </div>
                </div>

                <h3 className="text-lg font-black text-white uppercase tracking-tight truncate">
                  {m.full_name}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">
                  CPF: {maskDocument(m.cpf)}
                </p>

                <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                    <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
                        <ShieldCheck size={12}/> Acesso Ativo
                    </p>
                    <p className="text-[9px] text-slate-500 font-black uppercase group-hover:text-blue-400 transition-colors">Ver Credenciais</p>
                </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE CADASTRO / VISUALIZAÇÃO */}
      {isRegisteringMember && (
          <Modal onClose={() => { setIsRegisteringMember(false); setViewingMember(null); }} title={viewingMember ? "Credenciais do Membro" : "Cadastrar Novo Membro"}>
              {!generatedCredentials ? (
                  <div className="space-y-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4">
                          <p className="text-[10px] text-slate-400 uppercase font-bold text-center">
                              Preencha os dados do colaborador. O acesso será gerado imediatamente.
                          </p>
                      </div>

                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1 block">Nome Completo</label>
                          <input 
                              type="text" 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-blue-500 transition-colors"
                              value={newMemberForm.name}
                              onChange={e => setNewMemberForm({...newMemberForm, name: e.target.value})}
                              placeholder="Ex: João Silva"
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">CPF (Login)</label>
                              <input 
                                  type="text" 
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-blue-500 transition-colors"
                                  value={newMemberForm.cpf}
                                  onChange={e => setNewMemberForm({...newMemberForm, cpf: maskDocument(e.target.value)})}
                                  placeholder="000.000.000-00"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Telefone</label>
                              <input 
                                  type="tel" 
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-blue-500 transition-colors"
                                  value={newMemberForm.phone}
                                  onChange={e => setNewMemberForm({...newMemberForm, phone: maskPhone(e.target.value)})}
                                  placeholder="(00) 00000-0000"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Código de Acesso (Gerado)</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text" 
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-black text-center text-lg outline-none tracking-widest"
                                  value={newMemberForm.code}
                                  onChange={e => setNewMemberForm({...newMemberForm, code: onlyDigits(e.target.value)})}
                                  maxLength={6}
                              />
                              <button onClick={() => setNewMemberForm({...newMemberForm, code: Math.floor(1000 + Math.random() * 9000).toString()})} className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-colors">
                                  <KeyRound size={20}/>
                              </button>
                          </div>
                      </div>

                      <button onClick={handleRegisterMember} disabled={isSaving} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg transition-all mt-4 flex items-center justify-center gap-2">
                          {isSaving ? <Loader2 className="animate-spin"/> : <><UserPlus size={16}/> Confirmar Cadastro</>}
                      </button>
                  </div>
              ) : (
                  <div className="space-y-6 text-center animate-in zoom-in duration-300">
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                          <ShieldCheck size={40}/>
                      </div>
                      <div>
                          <h3 className="text-xl font-black text-white uppercase">{viewingMember ? 'Dados de Acesso' : 'Membro Cadastrado!'}</h3>
                          <p className="text-slate-400 text-xs mt-2">Compartilhe estas credenciais com o colaborador.</p>
                      </div>

                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left space-y-4">
                          <div>
                              <p className="text-[10px] text-slate-500 font-black uppercase">Link do Sistema</p>
                              <div className="flex gap-2 mt-1">
                                  <input readOnly value={generatedCredentials.link} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-blue-400 font-mono outline-none"/>
                                  <button onClick={() => { navigator.clipboard.writeText(generatedCredentials.link); showToast("Link copiado!"); }} className="p-2 bg-blue-600 text-white rounded-lg"><Copy size={14}/></button>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <p className="text-[10px] text-slate-500 font-black uppercase">Login (CPF)</p>
                                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg mt-1">
                                      <p className="text-base font-black text-white">{generatedCredentials.cpf}</p>
                                      <button onClick={() => { navigator.clipboard.writeText(generatedCredentials.cpf); showToast("CPF copiado!"); }} className="text-slate-500 hover:text-white"><Copy size={12}/></button>
                                  </div>
                              </div>
                              <div>
                                  <p className="text-[10px] text-slate-500 font-black uppercase">Código (PIN)</p>
                                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg mt-1">
                                      <p className="text-base font-black text-emerald-400 tracking-widest">{generatedCredentials.code}</p>
                                      <button onClick={() => { navigator.clipboard.writeText(generatedCredentials.code); showToast("Código copiado!"); }} className="text-slate-500 hover:text-white"><Copy size={12}/></button>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <button onClick={() => { setIsRegisteringMember(false); setViewingMember(null); }} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase text-xs">Concluído</button>
                  </div>
              )}
          </Modal>
      )}
    </div>
  );
};
