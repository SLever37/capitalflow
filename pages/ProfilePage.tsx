
import React, { useState, useMemo, useRef } from 'react';
import { User, Heart, LogOut, Camera, Download, History, Activity, AlertCircle, FileUp, Settings, RotateCcw } from 'lucide-react';
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
  handleExportBackup, profilePhotoInputRef, loans, profileCtrl
}) => {
  const [activeSection, setActiveSection] = useState<'PERSONAL' | 'BRAND' | 'DEFAULTS' | 'AUDIT'>('PERSONAL');
  const profileImportRef = useRef<HTMLInputElement>(null);
  const backupRestoreRef = useRef<HTMLInputElement>(null);

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
                        <Settings size={16}/> Preferências
                    </button>
                    <button onClick={() => setActiveSection('AUDIT')} className={`p-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-3 ${activeSection === 'AUDIT' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>
                        <History size={16}/> Auditoria Completa
                    </button>
                    
                    {/* BOTÃO RESTAURAR PLANILHA REPOSICIONADO AQUI */}
                    <button onClick={() => profileImportRef.current?.click()} className="p-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-3 bg-slate-950 text-emerald-500 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30">
                        <FileUp size={16}/> Restaurar Planilha
                    </button>
                    <input type="file" ref={profileImportRef} onChange={profileCtrl.handleImportProfile} className="hidden" accept=".csv,.xlsx,.xls" />
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

                               {/* ENDEREÇO JURÍDICO COMPLETO */}
                               <div className="mt-4 pt-4 border-t border-slate-800">
                                   <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">Endereço Jurídico <span className="text-[9px] text-slate-500 font-normal">(Para documentos)</span></h3>
                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                       <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">CEP</label><input type="text" value={profileEditForm.zipCode || ''} onChange={e => setProfileEditForm({...profileEditForm, zipCode: e.target.value})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                                       <div className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-500">Logradouro (Rua/Av)</label><input type="text" value={profileEditForm.address || ''} onChange={e => setProfileEditForm({...profileEditForm, address: e.target.value})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                                       <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Número</label><input type="text" value={profileEditForm.addressNumber || ''} onChange={e => setProfileEditForm({...profileEditForm, addressNumber: e.target.value})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                                       <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Bairro</label><input type="text" value={profileEditForm.neighborhood || ''} onChange={e => setProfileEditForm({...profileEditForm, neighborhood: e.target.value})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                                       <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Cidade</label><input type="text" value={profileEditForm.city || ''} onChange={e => setProfileEditForm({...profileEditForm, city: e.target.value})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                                       <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Estado (UF)</label><input type="text" value={profileEditForm.state || ''} onChange={e => setProfileEditForm({...profileEditForm, state: e.target.value.toUpperCase()})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" maxLength={2} /></div>
                                   </div>
                               </div>
                           </div>
                       )}

                       {activeSection === 'BRAND' && (
                           <div className="animate-in slide-in-from-right space-y-4">
                               <h3 className="text-sm font-bold text-white mb-2">Configurações Padrão de Contrato</h3>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Juros Padrão (%)</label><input type="number" value={profileEditForm.defaultInterestRate} onChange={e => setProfileEditForm({...profileEditForm, defaultInterestRate: Number(e.target.value)})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Multa Padrão (%)</label><input type="number" value={profileEditForm.defaultFinePercent} onChange={e => setProfileEditForm({...profileEditForm, defaultFinePercent: Number(e.target.value)})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
                                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500">Meta Capital (R$)</label><input type="number" value={profileEditForm.targetCapital} onChange={e => setProfileEditForm({...profileEditForm, targetCapital: Number(e.target.value)})} className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" /></div>
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
                           <div className="pt-6 border-t border-slate-800 flex flex-col gap-4">
                               <div className="flex gap-4">
                                   <button onClick={handleSaveProfile} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold uppercase shadow-lg hover:bg-blue-500 transition-all">Salvar Alterações</button>
                                   <button onClick={handleExportBackup} className="px-6 py-4 bg-slate-800 text-slate-400 rounded-xl font-bold uppercase hover:text-white transition-all flex items-center justify-center gap-2"><Download size={16}/> Backup</button>
                               </div>
                               
                               <div className="grid grid-cols-1 gap-4">
                                   {/* RESTAURAR SNAPSHOT (Planilha movida para sidebar) */}
                                   <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                                       <div className="flex flex-col">
                                           <span className="text-xs font-bold text-white uppercase flex items-center gap-2"><RotateCcw size={14} className="text-amber-500"/> Restaurar Backup</span>
                                           <span className="text-[10px] text-slate-500">Arquivo JSON</span>
                                       </div>
                                       <button onClick={() => backupRestoreRef.current?.click()} className="px-4 py-2 bg-slate-800 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase hover:bg-amber-500/10 transition-all">Selecionar</button>
                                       <input type="file" ref={backupRestoreRef} onChange={profileCtrl.handleRestoreBackup} className="hidden" accept=".json" />
                                   </div>
                               </div>
                           </div>
                       )}
                   </div>
                </div>
             )}
         </div>
    </div>
  );
};
