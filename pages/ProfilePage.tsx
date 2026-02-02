
import React, { useState } from 'react';
import { User, Save, Upload, Download, RefreshCw, Trash2, Shield, Settings, DollarSign, FileSpreadsheet, Lock, Camera, Palette, MapPin, Phone, LayoutGrid, ArrowUp, ArrowDown, CreditCard, Mail, FileText } from 'lucide-react';
import { UserProfile, Loan, AppTab } from '../types';
import { maskPhone, formatMoney, maskDocument } from '../utils/formatters';
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
  navOrder: AppTab[];
  hubOrder: AppTab[];
  saveNavConfig: (nav: AppTab[], hub: AppTab[]) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ 
  activeUser, handleLogout, setResetDataModal, handleDeleteAccount,
  profileEditForm, setProfileEditForm, handleSaveProfile, handlePhotoUpload, 
  handleExportBackup, profilePhotoInputRef, fileInputExcelRef, handleRestoreBackup, handleImportExcel,
  loans, navOrder, hubOrder, saveNavConfig
}) => {
  
  const { backupRestoreRef, auditLogs } = useProfilePageLogic(loans);
  const [activeSection, setActiveSection] = useState<'GENERAL' | 'FINANCE' | 'DATA' | 'INTERFACE' | 'SECURITY'>('GENERAL');

  const getTabLabel = (tab: AppTab) => {
    switch (tab) {
        case 'DASHBOARD': return 'Painel';
        case 'CLIENTS': return 'Clientes';
        case 'TEAM': return 'Equipe';
        case 'SOURCES': return 'Fundos';
        case 'LEGAL': return 'Jurídico';
        case 'PROFILE': return 'Perfil';
        case 'MASTER': return 'Master';
        default: return tab;
    }
  };

  const moveTab = (tab: AppTab, from: 'NAV' | 'HUB', direction: 'UP' | 'DOWN' | 'SWAP') => {
      let newNav = [...navOrder];
      let newHub = [...hubOrder];

      if (direction === 'SWAP') {
          if (from === 'NAV' && newNav.length > 1) {
              newNav = newNav.filter(t => t !== tab);
              newHub = [tab, ...newHub];
          } else if (from === 'HUB') {
              newHub = newHub.filter(t => t !== tab);
              newNav = [...newNav, tab];
          }
      } else {
          const target = from === 'NAV' ? newNav : newHub;
          const idx = target.indexOf(tab);
          if (direction === 'UP' && idx > 0) [target[idx], target[idx-1]] = [target[idx-1], target[idx]];
          if (direction === 'DOWN' && idx < target.length-1) [target[idx], target[idx+1]] = [target[idx+1], target[idx]];
      }
      saveNavConfig(newNav, newHub);
  };

  if (!profileEditForm) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SIDEBAR DE NAVEGAÇÃO */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] relative overflow-hidden">
                <div className="flex flex-col items-center mb-6">
                    <div className="relative group cursor-pointer" onClick={() => profilePhotoInputRef.current?.click()}>
                        <div className="w-28 h-28 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-2xl overflow-hidden">
                            {profileEditForm.photo ? <img src={profileEditForm.photo} className="w-full h-full object-cover"/> : <User size={48} className="text-slate-600"/>}
                        </div>
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={24}/></div>
                    </div>
                    <h2 className="text-xl font-black text-white mt-4">{profileEditForm.name}</h2>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{profileEditForm.businessName || 'Operador'}</p>
                </div>

                <nav className="space-y-2">
                    <button onClick={() => setActiveSection('GENERAL')} className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${activeSection === 'GENERAL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <User size={18}/> <span className="font-bold text-xs uppercase">Dados do Perfil</span>
                    </button>
                    <button onClick={() => setActiveSection('FINANCE')} className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${activeSection === 'FINANCE' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <DollarSign size={18}/> <span className="font-bold text-xs uppercase">Financeiro & Metas</span>
                    </button>
                    <button onClick={() => setActiveSection('INTERFACE')} className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${activeSection === 'INTERFACE' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <LayoutGrid size={18}/> <span className="font-bold text-xs uppercase">Interface & Menus</span>
                    </button>
                    <button onClick={() => setActiveSection('DATA')} className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${activeSection === 'DATA' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <FileSpreadsheet size={18}/> <span className="font-bold text-xs uppercase">Dados & Backup</span>
                    </button>
                    <button onClick={() => setActiveSection('SECURITY')} className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${activeSection === 'SECURITY' ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Shield size={18}/> <span className="font-bold text-xs uppercase">Segurança</span>
                    </button>
                </nav>

                <button onClick={handleLogout} className="w-full mt-6 py-4 border border-slate-800 text-slate-500 rounded-2xl font-bold uppercase text-xs hover:bg-slate-800 hover:text-white transition-all">Sair do Sistema</button>
            </div>
        </div>

        {/* ÁREA DE CONTEÚDO */}
        <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[2.5rem]">
                
                {/* --- SEÇÃO GERAL --- */}
                {activeSection === 'GENERAL' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right">
                        <div className="flex items-center gap-3 text-blue-500 mb-4">
                            <User size={24}/>
                            <h3 className="text-lg font-black uppercase">Informações Gerais</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome de Acesso (Username)</label>
                                    <input type="text" value={profileEditForm.name} onChange={e => setProfileEditForm({...profileEditForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1"><Mail size={12}/> E-mail</label>
                                    <input type="email" value={profileEditForm.email || ''} onChange={e => setProfileEditForm({...profileEditForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome do Negócio</label>
                                    <input type="text" value={profileEditForm.businessName} onChange={e => setProfileEditForm({...profileEditForm, businessName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1"><CreditCard size={12}/> Chave PIX Padrão</label>
                                    <input type="text" value={profileEditForm.pixKey} onChange={e => setProfileEditForm({...profileEditForm, pixKey: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-emerald-400 font-bold outline-none focus:border-emerald-500" placeholder="CPF, Email ou Telefone" />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome Completo</label>
                                    <input type="text" value={profileEditForm.fullName || ''} onChange={e => setProfileEditForm({...profileEditForm, fullName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1"><FileText size={12}/> CPF / CNPJ</label>
                                    <input type="text" value={profileEditForm.document || ''} onChange={e => setProfileEditForm({...profileEditForm, document: maskDocument(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" placeholder="000.000.000-00"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1"><Phone size={12}/> WhatsApp de Contato</label>
                                    <input type="text" value={profileEditForm.phone} onChange={e => setProfileEditForm({...profileEditForm, phone: maskPhone(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1"><MapPin size={12}/> Endereço Base</label>
                                    <input type="text" value={profileEditForm.address} onChange={e => setProfileEditForm({...profileEditForm, address: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" placeholder="Rua, Número, Bairro" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Cidade</label>
                                        <input type="text" value={profileEditForm.city} onChange={e => setProfileEditForm({...profileEditForm, city: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Estado (UF)</label>
                                        <input type="text" value={profileEditForm.state} onChange={e => setProfileEditForm({...profileEditForm, state: e.target.value.toUpperCase()})} maxLength={2} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-800">
                            <h4 className="text-xs font-black text-white uppercase mb-4 flex items-center gap-2"><Palette size={14} className="text-purple-500"/> Personalização</h4>
                            <div className="flex gap-4 items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Cor da Marca</label>
                                    <input type="color" value={profileEditForm.brandColor || '#2563eb'} onChange={e => setProfileEditForm({...profileEditForm, brandColor: e.target.value})} className="w-12 h-12 rounded cursor-pointer bg-transparent border-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Logo URL (Opcional)</label>
                                    <input type="text" value={profileEditForm.logoUrl} onChange={e => setProfileEditForm({...profileEditForm, logoUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white" placeholder="https://..." />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SEÇÃO FINANCEIRA --- */}
                {activeSection === 'FINANCE' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right">
                        <div className="flex items-center gap-3 text-emerald-500 mb-4">
                            <DollarSign size={24}/>
                            <h3 className="text-lg font-black uppercase">Configurações Financeiras</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Juros Padrão (%)</label>
                                <input type="number" value={profileEditForm.defaultInterestRate} onChange={e => setProfileEditForm({...profileEditForm, defaultInterestRate: parseFloat(e.target.value)})} className="w-full bg-transparent text-2xl font-black text-emerald-400 outline-none" />
                            </div>
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Multa Padrão (%)</label>
                                <input type="number" value={profileEditForm.defaultFinePercent} onChange={e => setProfileEditForm({...profileEditForm, defaultFinePercent: parseFloat(e.target.value)})} className="w-full bg-transparent text-2xl font-black text-emerald-400 outline-none" />
                            </div>
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Mora Diária (%)</label>
                                <input type="number" value={profileEditForm.defaultDailyInterestPercent} onChange={e => setProfileEditForm({...profileEditForm, defaultDailyInterestPercent: parseFloat(e.target.value)})} className="w-full bg-transparent text-2xl font-black text-emerald-400 outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">Meta de Capital (R$)</label>
                                <input type="number" value={profileEditForm.targetCapital} onChange={e => setProfileEditForm({...profileEditForm, targetCapital: parseFloat(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">Meta de Lucro (R$)</label>
                                <input type="number" value={profileEditForm.targetProfit} onChange={e => setProfileEditForm({...profileEditForm, targetProfit: parseFloat(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-emerald-500" />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SEÇÃO DADOS E BACKUP --- */}
                {activeSection === 'DATA' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right">
                        <div className="flex items-center gap-3 text-amber-500 mb-4">
                            <FileSpreadsheet size={24}/>
                            <h3 className="text-lg font-black uppercase">Dados e Backup</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group hover:border-blue-500 transition-all">
                                <div>
                                    <h4 className="text-white font-bold text-sm uppercase">Exportar Backup Completo</h4>
                                    <p className="text-[10px] text-slate-500">Baixe um arquivo JSON com todos seus clientes e contratos.</p>
                                </div>
                                <button onClick={handleExportBackup} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-lg transition-all"><Download size={20}/></button>
                            </div>

                            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group hover:border-emerald-500 transition-all">
                                <div>
                                    <h4 className="text-white font-bold text-sm uppercase">Importar Planilha (Excel)</h4>
                                    <p className="text-[10px] text-slate-500">Carregue clientes em massa via arquivo .xlsx ou .csv.</p>
                                </div>
                                <button onClick={() => fileInputExcelRef.current?.click()} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg transition-all"><FileSpreadsheet size={20}/></button>
                            </div>

                            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group hover:border-amber-500 transition-all">
                                <div>
                                    <h4 className="text-white font-bold text-sm uppercase">Restaurar do Backup</h4>
                                    <p className="text-[10px] text-slate-500">Recupere seus dados a partir de um arquivo JSON anterior.</p>
                                </div>
                                <button onClick={() => backupRestoreRef.current?.click()} className="p-3 bg-amber-600 text-white rounded-xl hover:bg-amber-500 shadow-lg transition-all"><RefreshCw size={20}/></button>
                            </div>
                        </div>
                        
                        <input type="file" ref={fileInputExcelRef} className="hidden" accept=".xlsx,.csv" onChange={handleImportExcel} />
                        <input type="file" ref={backupRestoreRef} className="hidden" accept=".json" onChange={handleRestoreBackup} />
                    </div>
                )}

                {/* --- SEÇÃO INTERFACE (NAVHUB) --- */}
                {activeSection === 'INTERFACE' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right">
                        <div className="flex items-center gap-3 text-purple-500 mb-4">
                            <LayoutGrid size={24}/>
                            <h3 className="text-lg font-black uppercase">Personalizar Menus</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2"><ArrowDown size={14}/> Barra Inferior (Fixo)</h4>
                                <div className="space-y-2">
                                    {navOrder.map((tab) => (
                                        <div key={tab} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between group">
                                            <span className="text-xs font-bold text-white uppercase">{getTabLabel(tab)}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => moveTab(tab, 'NAV', 'UP')} className="p-1.5 hover:bg-slate-800 rounded"><ArrowUp size={12}/></button>
                                                <button onClick={() => moveTab(tab, 'NAV', 'DOWN')} className="p-1.5 hover:bg-slate-800 rounded"><ArrowDown size={12}/></button>
                                                <button onClick={() => moveTab(tab, 'NAV', 'SWAP')} className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded" title="Mover para o Hub">Hub</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-widest flex items-center gap-2"><LayoutGrid size={14}/> Hub Central (Menu)</h4>
                                <div className="space-y-2">
                                    {hubOrder.map((tab) => (
                                        <div key={tab} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between group">
                                            <span className="text-xs font-bold text-white uppercase">{getTabLabel(tab)}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => moveTab(tab, 'HUB', 'UP')} className="p-1.5 hover:bg-slate-800 rounded"><ArrowUp size={12}/></button>
                                                <button onClick={() => moveTab(tab, 'HUB', 'DOWN')} className="p-1.5 hover:bg-slate-800 rounded"><ArrowDown size={12}/></button>
                                                <button onClick={() => moveTab(tab, 'HUB', 'SWAP')} className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded" title="Mover para a Barra">Barra</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SEÇÃO SEGURANÇA E LOGS --- */}
                {activeSection === 'SECURITY' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right">
                        <div className="flex items-center gap-3 text-rose-500 mb-4">
                            <Shield size={24}/>
                            <h3 className="text-lg font-black uppercase">Segurança e Auditoria</h3>
                        </div>

                        <ProfileAuditLog logs={auditLogs} />
                        <ProfileDangerZone onResetData={() => setResetDataModal(true)} onDeleteAccount={handleDeleteAccount} />
                    </div>
                )}

                {/* BOTÃO DE SALVAR GERAL */}
                <div className="pt-8 mt-8 border-t border-slate-800 sticky bottom-0 bg-slate-900 pb-2">
                    <button 
                        onClick={handleSaveProfile}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-sm shadow-2xl shadow-blue-900/20 transition-all flex items-center justify-center gap-3"
                    >
                        <Save size={20}/> Salvar Alterações
                    </button>
                </div>

            </div>
        </div>
    </div>
  );
};
