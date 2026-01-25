
import React from 'react';
import { Edit, ShieldAlert, KeyRound } from 'lucide-react';

interface MasterPageProps {
  allUsers: any[];
  sacSearch: string;
  setSacSearch: (term: string) => void;
  setMasterEditUser: (user: any) => void;
  handleToggleAdmin: (user: any) => void;
  handleAdminResetPassword: (user: any) => void;
  ui?: any;
}

export const MasterPage: React.FC<MasterPageProps> = ({ 
  allUsers, sacSearch, setSacSearch, setMasterEditUser, handleToggleAdmin, handleAdminResetPassword, ui
}) => {
  
  // Função helper para verificar online (últimos 5 min)
  const isOnline = (lastActive?: string) => {
      if (!lastActive) return false;
      const diff = new Date().getTime() - new Date(lastActive).getTime();
      return diff < 5 * 60 * 1000; // 5 minutos
  };

  return (
    <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-white uppercase">Gestão Master</h2>
                <div className="flex gap-2">
                    <input type="text" placeholder="Buscar usuário..." className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-white text-sm outline-none" value={sacSearch} onChange={e => setSacSearch(e.target.value)} />
                </div>
            </div>
            <div className="space-y-3">
                {allUsers.filter(u => u.nome_operador.toLowerCase().includes(sacSearch.toLowerCase()) || u.usuario_email.toLowerCase().includes(sacSearch.toLowerCase())).map(u => {
                    const userIsOnline = isOnline(u.last_active_at);
                    
                    return (
                        <div key={u.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div 
                                        className={`w-2.5 h-2.5 rounded-full ${userIsOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-700'}`} 
                                        title={userIsOnline ? 'Online agora' : `Visto por último: ${u.last_active_at ? new Date(u.last_active_at).toLocaleString() : 'Nunca'}`}
                                    ></div>
                                    <p className="font-bold text-white">{u.nome_operador} <span className="text-[10px] text-slate-500 uppercase">({u.access_level === 1 ? 'ADMIN' : 'USER'})</span></p>
                                </div>
                                <p className="text-xs text-slate-500 ml-4.5">{u.usuario_email}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setMasterEditUser(u); ui?.openModal('MASTER_EDIT_USER'); }} className="p-2 bg-slate-800 text-blue-500 rounded-lg hover:bg-slate-700 transition-colors"><Edit size={16}/></button>
                                <button onClick={() => handleToggleAdmin(u)} className="p-2 bg-slate-800 text-purple-500 rounded-lg hover:bg-slate-700 transition-colors"><ShieldAlert size={16}/></button>
                                <button onClick={() => handleAdminResetPassword(u)} className="p-2 bg-slate-800 text-rose-500 rounded-lg hover:bg-slate-700 transition-colors"><KeyRound size={16}/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};
