
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
  KeyRound,
  Phone,
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
};

export const TeamPage: React.FC<TeamPageProps> = ({
  activeUser,
  showToast,
  onRefresh,
}) => {
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Estados para Modal de Cadastro de Membro
  const [isRegisteringMember, setIsRegisteringMember] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({ name: '', phone: '', cpf: '', code: '' });
  const [generatedCredentials, setGeneratedCredentials] = useState<{cpf: string, code: string, link: string} | null>(null);

  const ownerId = activeUser?.id ?? null;
  const canUse = useMemo(() => !!ownerId, [ownerId]);

  const loadTeamData = async () => {
    if (!ownerId) return;

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
      // Gera código aleatório de 4 dígitos
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
          
          // 1. Cria Perfil do Membro (Login Sem Senha)
          // Usamos e-mail fictício para passar na constraint se existir, mas o login será via CPF/Code
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
              senha_acesso: 'NO_PASSWORD', // Não usa senha
              access_level: 2, 
              total_available_capital: 0,
              interest_balance: 0,
              created_at: new Date().toISOString()
          });

          if (profileError) throw new Error("Erro ao criar perfil: " + profileError.message);

          // 2. Vincula à Equipe
          const { error: memberError } = await supabase.from('team_members').insert({
              team_id: team.id,
              profile_id: profileId,
              linked_profile_id: profileId,
              full_name: name.trim(),
              cpf: cleanCPF,
              username_or_email: cleanCPF,
              role: 'MEMBER'
          });

          if (memberError) throw new Error("Erro ao vincular membro: " + memberError.message);

          // Sucesso
          setGeneratedCredentials({
              cpf: cleanCPF,
              code: code,
              link: window.location.origin // Link base para login
          });
          
          showToast("Membro cadastrado com sucesso!", "success");
          await loadTeamData();

      } catch (e: any) {
          showToast("Erro ao cadastrar: " + e.message, "error");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteMember = async (memberId: string, linkedProfileId: string | null) => {
    if (!confirm('Remover este membro? O acesso será revogado imediatamente.')) return;
    try {
      // Remove vínculo
      await supabase.from('team_members').delete().eq('id', memberId);
      
      // Opcional: Remover o perfil criado (soft delete ou hard delete)
      if (linkedProfileId) {
          await supabase.from('perfis').delete().eq('id', linkedProfileId);
      }

      showToast('Membro removido.', 'success');
      await loadTeamData();
    } catch (e: any) {
      showToast('Erro ao remover: ' + e.message, 'error');
    }
  };

  const copyMemberAccess = (m: TeamMemberRow) => {
      // Como não temos a senha/código salva em plain text facilmente acessível aqui (segurança),
      // Copiamos o link de login e instruções.
      const text = `Acesse: ${window.location.origin}\nLogin (CPF): ${m.cpf}\nUse seu Código de Acesso.`;
      navigator.clipboard.writeText(text);
      showToast("Dados de acesso copiados!", "success");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            <Briefcase className="text-blue-500" size={28} /> Minha Equipe
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Gestão de Acessos
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
        {!team ? (
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
              className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] group transition-all relative overflow-hidden hover:border-blue-500/30"
            >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-slate-800 overflow-hidden bg-slate-950">
                    <User size={28} className="text-slate-700" />
                  </div>
                  <div className="flex gap-2">
                      <button
                        onClick={() => copyMemberAccess(m)}
                        className="p-2 bg-slate-800 text-blue-400 hover:bg-blue-600/20 rounded-xl transition-colors"
                        title="Copiar Acesso"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(m.id, m.linked_profile_id)}
                        className="p-2 bg-slate-800 text-rose-500 hover:bg-rose-900/20 rounded-xl transition-colors"
                        title="Remover Membro"
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

                <div className="pt-6 border-t border-slate-800">
                    <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest flex items-center gap-1">
                        <ShieldCheck size={12}/> Acesso Ativo
                    </p>
                </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE CADASTRO */}
      {isRegisteringMember && (
          <Modal onClose={() => setIsRegisteringMember(false)} title="Cadastrar Novo Membro">
              {!generatedCredentials ? (
                  <div className="space-y-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4">
                          <p className="text-[10px] text-slate-400 uppercase font-bold text-center">
                              Preencha os dados do colaborador. O acesso será gerado imediatamente.
                          </p>
                      </div>

                      <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Nome Completo</label>
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
                          <h3 className="text-xl font-black text-white uppercase">Membro Cadastrado!</h3>
                          <p className="text-slate-400 text-xs mt-2">Envie estas credenciais para o colaborador.</p>
                      </div>

                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left space-y-4">
                          <div>
                              <p className="text-[10px] text-slate-500 font-black uppercase">Link de Acesso</p>
                              <div className="flex gap-2 mt-1">
                                  <input readOnly value={generatedCredentials.link} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-blue-400 font-mono outline-none"/>
                                  <button onClick={() => navigator.clipboard.writeText(generatedCredentials.link)} className="p-2 bg-blue-600 text-white rounded-lg"><Copy size={14}/></button>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <p className="text-[10px] text-slate-500 font-black uppercase">Login (CPF)</p>
                                  <p className="text-lg font-black text-white">{generatedCredentials.cpf}</p>
                              </div>
                              <div>
                                  <p className="text-[10px] text-slate-500 font-black uppercase">Código</p>
                                  <p className="text-lg font-black text-emerald-400 tracking-widest">{generatedCredentials.code}</p>
                              </div>
                          </div>
                      </div>

                      <button onClick={() => setIsRegisteringMember(false)} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase text-xs">Fechar</button>
                  </div>
              )}
          </Modal>
      )}
    </div>
  );
};
