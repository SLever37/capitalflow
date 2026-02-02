
import React, { useState } from 'react';
// Added Users icon to the import list to fix the missing component error on line 92
import { Briefcase, UserPlus, Link as LinkIcon, DollarSign, ArrowRight, User, Palette, Image as ImageIcon, CheckCircle2, ShieldCheck, Copy, Trash2, Loader2, Save, Users } from 'lucide-react';
import { UserProfile, CapitalSource } from '../types';
import { formatMoney } from '../utils/formatters';
import { supabase } from '../lib/supabase';
import { generateUUID } from '../utils/generators';

interface TeamPageProps {
    activeUser: UserProfile | null;
    staffMembers: UserProfile[];
    sources: CapitalSource[];
    showToast: (msg: string, type?: any) => void;
    onRefresh: () => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({ activeUser, staffMembers, sources, showToast, onRefresh }) => {
    const [isCreatingInvite, setIsCreatingInvite] = useState(false);
    const [inviteApport, setInviteApport] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleCreateInvite = async () => {
        if (!activeUser) return;
        const apport = parseFloat(inviteApport) || 0;
        const token = Math.random().toString(36).substring(2, 10).toUpperCase();
        const url = `${window.location.origin}/register?invite=${token}&master=${activeUser.id}&apport=${apport}`;
        setInviteLink(url);
        setIsCreatingInvite(false);
        showToast("Link mágico gerado!", "success");
    };

    const handleSaveStaffBranding = async () => {
        if (!editingStaff) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.from('perfis').update({
                nome_empresa: editingStaff.businessName,
                brand_color: editingStaff.brandColor,
                logo_url: editingStaff.logoUrl,
                interest_balance: editingStaff.interestBalance // Permite Master ajustar saldo se necessário
            }).eq('id', editingStaff.id);
            
            if (error) throw error;
            showToast("Identidade da unidade atualizada!", "success");
            setEditingStaff(null);
            onRefresh();
        } catch (e: any) {
            showToast("Erro ao salvar: " + e.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
                        <Briefcase className="text-blue-500" size={28}/> Gestão de Unidades
                    </h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Sua Equipe • Unidades Independentes</p>
                </div>
                <button 
                    onClick={() => setIsCreatingInvite(true)}
                    className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg"
                >
                    <UserPlus size={16}/> Expandir Equipe
                </button>
            </div>

            {inviteLink && (
                <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-in zoom-in-95">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg"><LinkIcon size={20}/></div>
                        <div>
                            <p className="text-white font-bold text-sm">Link de Convite Ativo</p>
                            <p className="text-[10px] text-blue-400 font-black uppercase">Válido para 1 novo cadastro</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <input readOnly value={inviteLink} className="flex-1 md:w-64 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-[10px] text-slate-400 font-mono truncate" />
                        <button onClick={() => { navigator.clipboard.writeText(inviteLink); showToast("Link copiado!"); }} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all"><Copy size={16}/></button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffMembers.length === 0 ? (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-40">
                        {/* Users icon now correctly imported from lucide-react */}
                        <Users className="mx-auto text-slate-700 mb-4" size={48}/>
                        <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Sua rede está vazia.</p>
                    </div>
                ) : staffMembers.map(staff => (
                    <div key={staff.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] group hover:border-blue-500/50 transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -mr-16 -mt-16"></div>
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div 
                                className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-slate-800 overflow-hidden bg-slate-950"
                                style={{ borderColor: staff.brandColor || '#334155' }}
                            >
                                {staff.logoUrl ? <img src={staff.logoUrl} className="w-full h-full object-contain p-2"/> : <User size={28} className="text-slate-700"/>}
                            </div>
                            <button onClick={() => setEditingStaff(staff)} className="p-2 bg-slate-800 text-slate-500 hover:text-white rounded-xl transition-colors"><Palette size={16}/></button>
                        </div>
                        
                        <h3 className="text-lg font-black text-white uppercase tracking-tight truncate">{staff.name}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">{staff.businessName || 'Unidade Independente'}</p>

                        <div className="space-y-3 pt-6 border-t border-slate-800">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] font-black text-slate-500 uppercase">Geração de Juros</span>
                                <span className="text-sm font-black text-emerald-400">{formatMoney(staff.interestBalance)}</span>
                            </div>
                        </div>

                        <button onClick={() => setEditingStaff(staff)} className="w-full mt-8 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">Configurar Unidade</button>
                    </div>
                ))}
            </div>

            {/* Modal de Convite */}
            {isCreatingInvite && (
                <div className="fixed inset-0 z-[100] bg-slate-950/98 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[3rem] p-8 space-y-6 animate-in zoom-in-95">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><ShieldCheck size={32}/></div>
                            <h2 className="text-xl font-black text-white uppercase">Aporte Inicial</h2>
                            <p className="text-xs text-slate-500 mt-1">Quanto de fôlego esta unidade terá?</p>
                        </div>
                        <input type="number" placeholder="R$ 0,00" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-black text-lg outline-none focus:border-blue-500" value={inviteApport} onChange={e => setInviteApport(e.target.value)} />
                        <div className="flex gap-3">
                            <button onClick={() => setIsCreatingInvite(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px]">Cancelar</button>
                            <button onClick={handleCreateInvite} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px]">Gerar Link</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Branding da Unidade */}
            {editingStaff && (
                <div className="fixed inset-0 z-[100] bg-slate-950/98 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[3rem] p-8 space-y-6 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-white uppercase flex items-center gap-2"><Palette className="text-blue-500"/> Identidade da Unidade</h2>
                            <button onClick={() => setEditingStaff(null)} className="p-2 text-slate-500 hover:text-white"><Trash2 size={20}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">Nome da Unidade / Empresa</label>
                                <input type="text" value={editingStaff.businessName} onChange={e => setEditingStaff({...editingStaff, businessName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">Cor da Unidade</label>
                                    <div className="flex gap-2 items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <input type="color" value={editingStaff.brandColor || '#2563eb'} onChange={e => setEditingStaff({...editingStaff, brandColor: e.target.value})} className="w-10 h-10 rounded bg-transparent border-none cursor-pointer" />
                                        <span className="text-xs text-slate-400 font-mono">{editingStaff.brandColor || '#2563eb'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">Saldo p/ Saque (R$)</label>
                                    <input type="number" value={editingStaff.interestBalance} onChange={e => setEditingStaff({...editingStaff, interestBalance: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">URL da Logo (ou Base64)</label>
                                <div className="flex gap-3">
                                    <input type="text" value={editingStaff.logoUrl} onChange={e => setEditingStaff({...editingStaff, logoUrl: e.target.value})} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-xs outline-none" placeholder="https://..." />
                                    <div className="w-14 h-14 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center flex-shrink-0">
                                        {editingStaff.logoUrl ? <img src={editingStaff.logoUrl} className="w-full h-full object-contain p-1"/> : <ImageIcon className="text-slate-700"/>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setEditingStaff(null)} className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px]">Descartar</button>
                            <button onClick={handleSaveStaffBranding} disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Salvar Branding</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
