
import React, { useState, useMemo } from 'react';
import { User, Heart, LogOut, RefreshCcw, Camera, Upload, Download, FileSpreadsheet, Palette, Target, Settings2, Image, History, Activity, AlertCircle } from 'lucide-react';
import { UserProfile, Loan, LedgerEntry } from '../types';
import { maskPhone, formatMoney } from '../utils/formatters';
import { humanizeAuditLog } from '../utils/auditHelpers';

interface ProfilePageProps {
  activeUser: UserProfile;
  clients: any[]; 
  loans: Loan[];
  sources: any[];
  ui: any;
  profileCtrl: any;
  handleLogout: () => void;
  showToast: any; 
  setDonateModal: (val: boolean) => void;
  setResetDataModal: (val: boolean) => void;
  handleDeleteAccount: () => void;
  profileEditForm: UserProfile | null;
  setProfileEditForm: (val: UserProfile) => void;
  handleSaveProfile: () => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRestoreBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExportBackup: () => void;
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profilePhotoInputRef: React.RefObject<HTMLInputElement>;
  fileInputExcelRef: React.RefObject<HTMLInputElement>;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ 
  activeUser, setDonateModal, handleLogout, setResetDataModal, handleDeleteAccount,
  profileEditForm, setProfileEditForm, handleSaveProfile, handlePhotoUpload, 
  handleRestoreBackup, handleExportBackup, handleImportExcel, profilePhotoInputRef, fileInputExcelRef,
  loans
}) => {
  const [activeSection, setActiveSection] = useState<'PERSONAL' | 'BRAND' | 'DEFAULTS' | 'GOALS' | 'AUDIT'>('PERSONAL');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && profileEditForm) {
          if (file.size > 2 * 1024 * 1024) { alert("A imagem deve ter no máximo 2MB."); return; }
          const reader = new FileReader();
          reader.onloadend = () => { setProfileEditForm({ ...profileEditForm, logoUrl: reader.result as string }); };
          reader.readAsDataURL(file);
      }
  };

  const auditLogs = useMemo(() => {
      if (!loans) return [];
      const all = loans.flatMap(l => 
          (l.ledger || []).map(t => ({
              ...t,
              clientName: l.debtorName,
              loanId: l.id
          }))
      );
      return all.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);
  }, [loans]);

  const renderAuditEntry = (log: LedgerEntry & { clientName: string }) => {
      const isAudit = log.category === 'AUDIT' || log.notes?.startsWith('{');
      const lines = isAudit ? humanizeAuditLog(log.notes || '') : [log.notes || 'Operação realizada'];

      return (
        <div key={log.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-colors flex flex-col gap-3">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${log.type === 'ADJUSTMENT' ? 'bg-indigo-500/10 text-indigo-400' : log.type === 'LEND_MORE' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        <Activity size={18}/>
                    </div>
                    <div>
                        <p className="text-xs font-black text-white uppercase">{log.clientName}</p>
                        <p className="text-[10px] text-slate-500">{new Date(log.date).toLocaleString('pt-BR')}</p>
                    </div>
                </div>
                {!isAudit ? (
                    <p className={`text-sm font-black ${log.type === 'LEND_MORE' ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {log.type === 'LEND_MORE' ? '-' : '+'} {formatMoney(log.amount, false)}
                    </p>
                ) : (
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] font-black rounded uppercase">Audit Edit</span>
                )}
            </div>
            
            <div className={`p-3 rounded-xl ${isAudit ? 'bg-indigo-950/20 border border-indigo-500/20' : 'bg-slate-900/50'}`}>
                {lines.map((line, idx) => (
                    <p key={idx} className="text-[10px] text-slate-300 leading-relaxed italic flex items-start gap-2">
                        {isAudit && <AlertCircle size={10} className="mt-0.5 flex-shrink-0"/>}
                        {line}
                    </p>
                ))}
            </div>
        </div>
      );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] text-center relative overflow-hidden">
                <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-slate-900 shadow-2xl relative z-10 overflow-hidden">{activeUser.photo ? <img src={activeUser.photo} className="w-full h-full object-cover"/> : <User size={40} className="text-slate-600"/>}</div>
                <h2 className="text-xl font-black text-white">{activeUser.name}</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">{activeUser.businessName || 'Empreendedor'}</p>
                
                <div className="mt-8 flex flex-col gap-2">
                    <button onClick={() => setActiveSection('PERSONAL')} className={`p-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-3 ${activeSection === 'PERSONAL' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>
                        <User size={16}/> Dados Pessoais
                    </button>
                    <button onClick={() => setActiveSection('BRAND')} className={`p-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-3 ${activeSection === 'BRAND' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>
                        <Palette size={16}/> Marca & Identidade
                    </button>
                    <button onClick={() => setActiveSection('DEFAULTS')} className={`p-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-3 ${activeSection === 'DEFAULTS' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>
                        <Settings2 size={16}/> Padrões de Contrato
                    </button>
                    <button onClick={() => setActiveSection('GOALS')} className={`p-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-3 ${activeSection === 'GOALS' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>
                        <Target size={16}/> Metas Financeiras
                    </button>
                    <button onClick={() => setActiveSection('AUDIT')} className={`p-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-3 ${activeSection === 'AUDIT' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>
                        <History size={16}/> Auditoria Completa
                    </button>
                </div>

                <div className="mt-8 space-y-3 pt-6 border-t border-slate-800">
                    <button onClick={() => setDonateModal(true)} className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 hover:scale-105 shadow-lg"><Heart size={16}/> Apoiar Projeto</button>
                    <button onClick={handleLogout} className="w-full py-4 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-2xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2"><LogOut size={16}/> Sair</button>
                </div>
            </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
            {profileEditForm && (
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem]">
                   <div className="space-y-6">
                       
                       {activeSection === 'PERSONAL' && (
                           <div className="animate-in slide-in-from-right">
                               <div className="flex flex-col items-center mb-6"><div className="w-24 h-24 rounded-full bg-slate-950 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden relative group cursor-pointer">{profileEditForm.photo ? <img src={profileEditForm.photo} className="w-full h-full object-cover" /> : <Camera className="text-slate-500" />}<input type="file" ref={profilePhotoInputRef} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handlePhotoUpload} /></div><p className="text-[10px] text-slate-500 uppercase font-bold mt-2">Alterar Foto Pessoal</p></div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Nome Operador</label><input type="text" value={profileEditForm.name} onChange={e => setProfileEditForm({...profileEditForm, name: e.target.value})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Nome Empresa</label><input type="text" value={profileEditForm.businessName} onChange={e => setProfileEditForm({...profileEditForm, businessName: e.target.value})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">CPF / CNPJ</label><input type="text" value={profileEditForm.document} onChange={e => setProfileEditForm({...profileEditForm, document: e.target.value})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Telefone</label><input type="text" value={profileEditForm.phone} onChange={e => setProfileEditForm({...profileEditForm, phone: maskPhone(e.target.value)})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                               </div>
                           </div>
                       )}

                       {activeSection === 'AUDIT' && (
                           <div className="animate-in slide-in-from-right space-y-6">
                               <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl text-xs text-blue-300 font-bold mb-4 flex items-center gap-2">
                                   <History size={18}/> Registro detalhado de alterações e transações (Compliance)
                               </div>
                               <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                   {auditLogs.length === 0 ? (
                                       <div className="text-center text-slate-600 py-20 uppercase text-xs font-black tracking-widest border-2 border-dashed border-slate-800 rounded-3xl">Nenhum registro de auditoria.</div>
                                   ) : (
                                       auditLogs.map((log: any) => renderAuditEntry(log))
                                   )}
                               </div>
                           </div>
                       )}

                       {activeSection !== 'AUDIT' && (
                           <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row gap-4">
                               <button onClick={handleSaveProfile} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold uppercase shadow-lg hover:bg-blue-500 transition-all">Salvar Alterações</button>
                               <button onClick={handleExportBackup} className="px-6 py-4 bg-slate-800 text-slate-400 rounded-xl font-bold uppercase hover:text-white transition-all flex items-center justify-center gap-2"><Download size={16}/> Backup</button>
                           </div>
                       )}
                   </div>
                </div>
             )}
         </div>
    </div>
  );
};
