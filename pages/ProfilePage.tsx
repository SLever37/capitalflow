
import React from 'react';
import { User, Heart, LogOut, Camera, Download, History, FileUp, Settings, RotateCcw, ShieldAlert, Users } from 'lucide-react';
import { UserProfile, Loan } from '../types';
import { maskPhone } from '../utils/formatters';
import { useProfilePageLogic } from '../features/profile/hooks/useProfilePageLogic';
import { ProfileAuditLog } from '../features/profile/components/ProfileAuditLog';
import { ProfileDangerZone } from '../features/profile/components/ProfileDangerZone';

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
  
  const { activeSection, setActiveSection, profileImportRef, backupRestoreRef, auditLogs } = useProfilePageLogic(loans);

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
                    
                    {/* ALTERADO DE RESTAURAR PARA IMPORTAR CLIENTES */}
                    <button onClick={() => profileImportRef.current?.click()} className="p-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-3 bg-slate-950 text-emerald-500 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30">
                        <Users size={16}/> Importar Clientes (Excel)
                    </button>
                    <input type="file" ref={profileImportRef} onChange={profileCtrl.handleImportProfile} className="hidden" accept=".csv,.xlsx,.xls" />

                    <div className="h-px bg-slate-800 my-2"></div>

                    <button onClick={() => setActiveSection('DANGER')} className={`p-3 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-3 ${activeSection === 'DANGER' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-950 text-rose-500 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-500/30'}`}>
                        <ShieldAlert size={16}/> Área de Risco
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
                           <ProfileAuditLog logs={auditLogs} />
                       )}

                        {activeSection === 'DANGER' && (
                           <ProfileDangerZone 
                               onResetData={() => setResetDataModal(true)}
                               onDeleteAccount={handleDeleteAccount}
                           />
                       )}

                       {!['AUDIT', 'DANGER'].includes(activeSection) && (
                           <div className="pt-6 border-t border-slate-800 flex flex-col gap-4">
                               <div className="flex gap-4">
                                   <button onClick={handleSaveProfile} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold uppercase shadow-lg hover:bg-blue-500 transition-all">Salvar Perfil</button>
                                   <button onClick={handleExportBackup} className="px-6 py-4 bg-slate-800 text-slate-400 rounded-xl font-bold uppercase hover:text-white transition-all flex items-center justify-center gap-2"><Download size={16}/> Exportar JSON</button>
                               </div>
                               
                               <div className="grid grid-cols-1 gap-4">
                                   <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                                       <div className="flex flex-col">
                                           <span className="text-xs font-bold text-white uppercase flex items-center gap-2"><RotateCcw size={14} className="text-amber-500"/> Restaurar via Backup JSON</span>
                                           <span className="text-[10px] text-slate-500">Substitui o estado atual do sistema pelo do arquivo.</span>
                                       </div>
                                       <button onClick={() => backupRestoreRef.current?.click()} className="px-4 py-2 bg-slate-800 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase hover:bg-amber-500/10 transition-all">Restaurar</button>
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
