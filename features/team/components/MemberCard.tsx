
import React from 'react';
import { Users, Mail, ShieldCheck, ArrowRightLeft, Trash2, Clock } from 'lucide-react';

interface MemberCardProps {
  member: any;
  teams: any[];
  activeTeam: any;
  onMove: (memberId: string, currentTeamName: string) => void;
  onDelete: (memberId: string) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  teams,
  activeTeam,
  onMove,
  onDelete,
}) => {
  // O membro é considerado pendente se não tiver um profile_id vinculado
  const isPending = !member.profile_id;
  
  // Dados de fallback caso o perfil vinculado ainda não exista (ex: Erison)
  const nameDisplay = member.full_name || 'Operador Sem Nome';
  const emailDisplay = member.linked_profile?.usuario_email || member.username_or_email || 'Aguardando Ativação';
  const avatarUrl = member.linked_profile?.avatar_url;

  return (
    <div
      className={`bg-slate-900 border p-6 rounded-[2.5rem] flex flex-col group transition-all shadow-sm hover:shadow-xl relative overflow-hidden ${
        isPending ? 'border-blue-500/20' : 'border-slate-800 hover:border-indigo-500/50'
      }`}
    >
      {isPending && (
        <div className="absolute top-0 right-0 px-4 py-1.5 bg-blue-500/10 border-b border-l border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-bl-2xl flex items-center gap-1.5">
          <Clock size={10} className="animate-spin duration-1000"/> Aguardando Ativação
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 overflow-hidden shadow-inner">
          {avatarUrl ? (
            <img src={avatarUrl} alt={nameDisplay} className="w-full h-full object-cover" />
          ) : (
            <Users size={28} className={isPending ? 'text-blue-500/40' : ''} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-black text-sm sm:text-base uppercase truncate leading-tight">
            {nameDisplay}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-500 text-[9px] uppercase font-black tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {member.cpf || 'S/ CPF'}
            </span>
            {member.role === 'ADMIN' && <ShieldCheck size={12} className="text-blue-500" />}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Mail size={12} className="text-indigo-500/50" />
          <span className="text-[10px] font-medium truncate">
            {emailDisplay}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          {member.role === 'ADMIN' ? 'Administrador' : 'Operador'}
        </span>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={() => onMove(member.id, nameDisplay)}
            className="p-3 bg-slate-950 text-slate-600 hover:text-indigo-400 rounded-xl transition-all border border-slate-800"
            title="Mover Membro"
          >
            <ArrowRightLeft size={16} />
          </button>
          <button
            onClick={() => onDelete(member.id)}
            className="p-3 bg-slate-950 text-slate-600 hover:text-rose-500 rounded-xl transition-all border border-slate-800"
            title="Remover Acesso"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
