
import React, { useState } from 'react';
import { Briefcase, UserPlus, Link as LinkIcon, User, Palette, Image as ImageIcon, ShieldCheck, Copy, Trash2, Loader2, Save, Users, UserCheck } from 'lucide-react';
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
    const [memberName, setMemberName] = useState(''); // Mudado de aporte para Nome
    const [inviteLink, setInviteLink] = useState('');
    const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleCreateMemberInvite = async () => {
        if (!activeUser) return;
        if (!memberName.trim()) {
            showToast("Informe o nome do membro para gerar o convite.", "error");
            return;
        }
        
        setIsSaving(true);
        try {
            // 1. Gera um Token Único e Seguro
            const inviteToken = generateUUID();
            
            // 2. Cria o Perfil "Oco" (Placeholder) no Banco
            // Usamos 'recovery_phrase' para armazenar o token de convite temporariamente
            const newProfileId = generateUUID();
            
            const { error } = await supabase.from('perfis').insert({
                id: newProfileId,
                supervisor_id: activeUser.id,
                nome_operador: memberName.trim(),
                nome_completo: memberName.trim(), // Inicialmente igual
                email: `${newProfileId}@pending.invite`, // Email temporário único
                usuario_email: `${newProfileId}@pending.invite`,
                senha_acesso: generateUUID(), // Senha impossível inicialmente
                access_level: 2, // Nível Membro
                recovery_phrase: `INVITE:${inviteToken}`, // FLAG DE CONVITE
                interest_balance: 0,
                total_available_capital: 0,
                created_at: new Date().toISOString()
            });

            if (error) throw error;

            // 3. Gera o Link Único
            const url = `${window.location.origin}/?invite_token=${inviteToken}`;
            
            setInviteLink(url);
            setIsCreatingInvite(false);
            setMemberName('');
            onRefresh(); // Atualiza a lista para mostrar o novo membro pendente
            showToast("Membro pré-cadastrado! Envie o link exclusivo.", "success");

        } catch (e: any) {
            showToast("Erro ao gerar convite: " + e.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyLink = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            showToast("Link único copiado! Envie apenas para este membro.", "success");
        } catch (err) {
            const input = document.getElementById('invite-input') as HTMLInputElement;
            if (input) {
                input.select();
                document.execCommand('copy');
                showToast("Link copiado!", "success");
            }
        }
    };

    const handleSaveStaffBranding = async () => {
        if (!editingStaff) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.from('perfis').update({
                nome_empresa: editingStaff.businessName,
                brand_color: editingStaff.brandColor,
                logo_url: editingStaff.logoUrl,
                // Master pode ajustar saldo de lucro do membro se necessário (comissões)
                interest_balance: editingStaff.interestBalance 
            }).eq('id', editingStaff.id);
            
            if (error) throw error;
            showToast("Unidade atualizada!", "success");
            setEditingStaff(null);
            onRefresh();
        } catch (e: any) {
            showToast("Erro ao salvar: " + e.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMember = async (staffId: string) => {
        if (!confirm("Tem certeza? Isso impedirá o acesso deste membro.")) return;
        try {
            const { error } = await supabase.from('perfis').delete().eq('id', staffId);
            if(error) throw error;
            showToast("Membro removido.", "success");
            onRefresh();
        } catch(e: any) {
            showToast("Erro ao remover: " + e.message, "error");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
                        <Briefcase className="text-blue-500" size={28}/> Minha Equipe
                    </h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gestão de Acessos e Unidades</p>
                </div>
                <button 
                    onClick={() => { setInviteLink(''); setMemberName(''); setIsCreatingInvite(true); }}
                    className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                    <UserPlus size={16}/> Adicionar Membro
                </button>
            </div>

            {inviteLink && (
                <div className="bg-emerald-900/20 border border-emerald-500/30 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-in zoom-in-95">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-lg"><UserCheck size={20}/></div>
                        <div>
                            <p className="text-emerald-400 font-bold text-sm">Link de Acesso Único Gerado</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase">Este link é exclusivo para o novo membro.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <input 
                            id="invite-input"
                            readOnly 
                            value={inviteLink} 
                            className="flex-1 md:w-80 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono truncate outline-none focus:border-emerald-500 transition-colors" 
                            onClick={(e) => e.currentTarget.select()}
                        />
                        <button onClick={handleCopyLink} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all shadow-lg active:scale-95 flex items-center gap-2 font-bold text-xs uppercase"><Copy size={16}/> Copiar</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffMembers.length === 0 ? (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-40">
                        <Users className="mx-auto text-slate-700 mb-4" size={48}/>
                        <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Sua equipe está vazia.</p>
                    </div>
                ) : staffMembers.map(staff => {
                    const isPending = staff.recoveryPhrase && staff.recoveryPhrase.startsWith('INVITE:');
                    return (
                        <div key={staff.id} className={`bg-slate-900 border p-8 rounded-[3rem] group transition-all relative overflow-hidden ${isPending ? 'border-amber-500/30' : 'border-slate-800 hover:border-blue-500/50'}`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -mr-16 -mt-16"></div>
                            
                            {isPending && (
                                <div className="absolute top-6 right-6 bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                                    Pendente
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div 
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-slate-800 overflow-hidden bg-slate-950"
                                    style={{ borderColor: staff.brandColor || '#334155' }}
                                >
                                    {staff.logoUrl ? <img src={staff.logoUrl} className="w-full h-full object-contain p-2"/> : <User size={28} className="text-slate-700"/>}
                                </div>
                                <button onClick={() => handleDeleteMember(staff.id)} className="p-2 bg-slate-800 text-rose-500 hover:bg-rose-900/20 rounded-xl transition-colors"><Trash2 size={16}/></button>
                            </div>
                            
                            <h3 className="text-lg font-black text-white uppercase tracking-tight truncate">{staff.name}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">{staff.businessName || (isPending ? 'Aguardando Cadastro' : 'Unidade Ativa')}</p>

                            <div className="space-y-3 pt-6 border-t border-slate-800">
                                <div className="flex justify-between items-end">
                                    <span className="text-[9px] font-black text-slate-500 uppercase">Carteira (Lucro)</span>
                                    <span className="text-sm font-black text-emerald-400">{formatMoney(staff.interestBalance)}</span>
                                </div>
                            </div>

                            <button onClick={() => setEditingStaff(staff)} className="w-full mt-8 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">Configurar Acesso</button>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Pré-Cadastro */}
            {isCreatingInvite && (
                <div className="fixed inset-0 z-[100] bg-slate-950/98 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[3rem] p-8 space-y-6 animate-in zoom-in-95 shadow-2xl">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><ShieldCheck size={32}/></div>
                            <h2 className="text-xl font-black text-white uppercase">Novo Membro</h2>
                            <p className="text-xs text-slate-500 mt-1">Quem fará parte da sua equipe?</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-2 block">Nome de Identificação</label>
                            <input 
                                type="text" 
                                placeholder="Ex: João Silva" 
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-colors" 
                                value={memberName} 
                                onChange={e => setMemberName(e.target.value)} 
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsCreatingInvite(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px] hover:bg-slate-700 transition-all">Cancelar</button>
                            <button onClick={handleCreateMemberInvite} disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin" size={16}/> : 'Gerar Convite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Configuração da Unidade */}
            {editingStaff && (
                <div className="fixed inset-0 z-[100] bg-slate-950/98 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[3rem] p-8 space-y-6 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-white uppercase flex items-center gap-2"><Palette className="text-blue-500"/> Gestão de Unidade</h2>
                            <button onClick={() => setEditingStaff(null)} className="p-2 text-slate-500 hover:text-white rounded-full hover:bg-slate-800 transition-colors"><Trash2 size={20}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">Nome Comercial (Unidade)</label>
                                <input type="text" value={editingStaff.businessName} onChange={e => setEditingStaff({...editingStaff, businessName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">Cor da Marca</label>
                                    <div className="flex gap-2 items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <input type="color" value={editingStaff.brandColor || '#2563eb'} onChange={e => setEditingStaff({...editingStaff, brandColor: e.target.value})} className="w-10 h-10 rounded bg-transparent border-none cursor-pointer" />
                                        <span className="text-xs text-slate-400 font-mono">{editingStaff.brandColor || '#2563eb'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">Saldo Lucro (R$)</label>
                                    <input type="number" value={editingStaff.interestBalance} onChange={e => setEditingStaff({...editingStaff, interestBalance: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-colors" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2">URL Logo (Opcional)</label>
                                <div className="flex gap-3">
                                    <input type="text" value={editingStaff.logoUrl} onChange={e => setEditingStaff({...editingStaff, logoUrl: e.target.value})} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-xs outline-none focus:border-blue-500 transition-colors" placeholder="https://..." />
                                    <div className="w-14 h-14 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center flex-shrink-0">
                                        {editingStaff.logoUrl ? <img src={editingStaff.logoUrl} className="w-full h-full object-contain p-1"/> : <ImageIcon className="text-slate-700"/>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setEditingStaff(null)} className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px]">Cancelar</button>
                            <button onClick={handleSaveStaffBranding} disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-blue-500 transition-all shadow-lg disabled:opacity-50">
                                {isSaving ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Salvar Ajustes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
