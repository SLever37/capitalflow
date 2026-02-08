
import React from 'react';
import { Layers, Edit2, Trash2, UserPlus, Plus } from 'lucide-react';

interface TeamUnitHeaderProps {
  teams: any[];
  activeTeam: any;
  setActiveTeam: (team: any) => void;
  onEdit: () => void;
  onDelete: () => void;
  onNewMember: () => void;
  onCreate: () => void; // Nova prop
}

export const TeamUnitHeader: React.FC<TeamUnitHeaderProps> = ({
  teams,
  activeTeam,
  setActiveTeam,
  onEdit,
  onDelete,
  onNewMember,
  onCreate,
}) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
      <div className="flex items-center gap-4 w-full lg:w-auto">
        <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-900/20">
          <Layers size={28} />
        </div>
        <div className="flex-1">
          <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1 block ml-1">
            Unidade de Negócio Ativa
          </label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-2xl focus-within:border-indigo-500 transition-all">
            <select
              value={activeTeam?.id || ''}
              onChange={(e) => setActiveTeam(teams.find((t) => t.id === e.target.value))}
              className="bg-transparent text-white text-sm font-black uppercase tracking-tight px-3 py-2 outline-none cursor-pointer flex-1 min-w-[140px]"
            >
              {teams.length === 0 ? (
                <option disabled>Nenhuma Unidade</option>
              ) : (
                teams.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.name}
                  </option>
                ))
              )}
            </select>

            <div className="flex gap-1 pr-1 border-l border-slate-800 ml-1 pl-1">
              <button
                onClick={onEdit}
                className="p-2.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                title="Editar Nome"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={onDelete}
                className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-950/30 rounded-xl transition-all"
                title="Excluir Unidade"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 w-full sm:w-auto">
        <button
          onClick={onCreate}
          className="flex-1 sm:flex-none px-6 py-4 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={16} /> Nova Unidade
        </button>
        <button
          onClick={onNewMember}
          className="flex-1 sm:flex-none px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <UserPlus size={18} /> Novo Membro
        </button>
      </div>
    </div>
  );
};
