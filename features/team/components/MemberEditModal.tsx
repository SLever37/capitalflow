
import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Loader2, Save, User, Shield, Layers, Mail } from 'lucide-react';
import { maskDocument } from '../../../utils/formatters';

interface MemberEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  teams: any[];
  onSave: (memberId: string, updates: any) => Promise<void>;
  isLoading: boolean;
}

export const MemberEditModal: React.FC<MemberEditModalProps> = ({ 
  isOpen, onClose, member, teams, onSave, isLoading 
}) => {
  const [form, setForm] = useState({
    full_name: '',
    role: '',
    team_id: '',
    supervisor_id: ''
  });

  useEffect(() => {
    if (member) {
      setForm({
        full_name: member.full_name || '',
        role: member.role || 'MEMBER',
        team_id: member.team_id || '',
        supervisor_id: member.supervisor_id || ''
      });
    }
  }, [member]);

  const handleSubmit = async () => {
    if (!member) return;
    await onSave(member.id, form);
    onClose();
  };

  if (!isOpen || !member) return null;

  return (
    <Modal onClose={onClose} title="Editar Membro">
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                <User size={24}/>
            </div>
            <div>
                <h3 className="text-white font-black uppercase text-xs tracking-widest">{member.full_name}</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">{member.cpf ? maskDocument(member.cpf) : 'Sem CPF'}</p>
            </div>
        </div>

        <div className="space-y-4">
          <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Nome de Exibição</label>
              <input 
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-colors text-sm font-bold" 
                  value={form.full_name} 
                  onChange={e => setForm({...form, full_name: e.target.value})} 
              />
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Cargo / Papel</label>
                  <div className="relative">
                      <select 
                          className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 appearance-none text-sm font-bold uppercase"
                          value={form.role}
                          onChange={e => setForm({...form, role: e.target.value})}
                      >
                          <option value="MEMBER">Operador</option>
                          <option value="ADMIN">Administrador</option>
                      </select>
                      <Shield size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"/>
                  </div>
              </div>
              <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Equipe</label>
                  <div className="relative">
                      <select 
                          className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 appearance-none text-sm font-bold uppercase"
                          value={form.team_id}
                          onChange={e => setForm({...form, team_id: e.target.value})}
                      >
                          {teams.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                      </select>
                      <Layers size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"/>
                  </div>
              </div>
          </div>

          <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Superior Direto (Hierarquia)</label>
              <div className="relative">
                  <select 
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 appearance-none text-sm font-bold uppercase"
                      value={form.supervisor_id}
                      onChange={e => setForm({...form, supervisor_id: e.target.value})}
                  >
                      <option value="">Sem Superior (Nível Topo)</option>
                      {/* Aqui poderíamos listar outros membros que podem ser supervisores */}
                      {/* Para simplificar, vamos permitir selecionar qualquer um por enquanto */}
                  </select>
                  <Layers size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"/>
              </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={isLoading} 
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
        >
          {isLoading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16}/> Salvar Alterações</>}
        </button>
      </div>
    </Modal>
  );
};
