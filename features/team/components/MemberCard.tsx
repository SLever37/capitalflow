
import React from 'react';
import { Trash2, User, ShieldCheck, Mail, Clock, AlertCircle, Edit } from 'lucide-react';
import { maskDocument } from '../../../utils/formatters';

interface MemberCardProps {
  member: any;
  onDelete: (id: string) => void;
  onEdit: (member: any) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, onDelete, onEdit }) => {
  // Erison no CSV não tem profile_id vinculado
  const isPending = !member.profile_id;
  
  // No seu CSV o Erison tem CPF/Email no campo username_or_email
  const emailDisplay = member.linked_profile?.usuario_email || member.username_or_email || "Não ativado";
  const avatarUrl = member.linked_profile?.avatar_url;

  // Normaliza papéis: MEMBRO (do seu CSV) ou MEMBER/ADMIN
  const roleRaw = String(member.role || '').toUpperCase();
  const isAdmin = roleRaw === 'ADMIN';
  const roleLabel = isAdmin ? 'Administrador' : 'Operador';

  return (
    <div className={`bg-slate-900 border p-6 rounded-[2.5rem] flex flex-col group transition-all shadow-sm hover:shadow-xl relative overflow-hidden ${isPending ? 'border-blue-500/20' : 'border-slate-800 hover:border-blue-500/50'}`}>
      
      {isPending && (
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-blue-500/10 border-b border-l border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-bl-2xl flex items-center gap-1.5">
              <AlertCircle size={10}/> Convite Aguardando Login
          </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-slate-500 border overflow-hidden shadow-inner ${isPending ? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-slate-700'}`}>
           {avatarUrl ? (
               <img src={avatarUrl} alt={member.full_name} className="w-full h-full object-cover" />
           ) : (
               <User size={28} className={isPending ? 'text-blue-500/50' : ''} />
           )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-black text-sm sm:text-base uppercase truncate leading-tight">
            {member.full_name || 'Membro sem nome'}
          </h3>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-slate-500 text-[9px] uppercase font-black tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {member.cpf ? maskDocument(member.cpf) : 'S/ CPF'}
             </span>
             {isAdmin && <ShieldCheck size={12} className="text-blue-500"/>}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-slate-400">
              <Mail size={12} className="text-blue-500/50"/>
              <span className="text-[10px] font-medium truncate">{emailDisplay}</span>
          </div>
          {member.linked_profile?.last_active_at && (
              <div className="flex items-center gap-2 text-slate-500">
                  <Clock size={12}/>
                  <span className="text-[9px] uppercase font-bold">Visto em: {new Date(member.linked_profile.last_active_at).toLocaleDateString()}</span>
              </div>
          )}
      </div>
      
      <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {roleLabel}
          </span>
          <div className="flex gap-2">
            <button 
                onClick={() => onEdit(member)} 
                className="p-3 bg-slate-950 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-slate-800"
                title="Editar Membro"
            >
                <Edit size={16} />
            </button>
            <button 
                onClick={() => onDelete(member.id)} 
                className="p-3 bg-slate-950 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-800 hover:border-rose-500/30"
                title="Excluir Membro"
            >
                <Trash2 size={16} />
            </button>
          </div>
      </div>
    </div>
  );
};
