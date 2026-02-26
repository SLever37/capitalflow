import React, { useEffect, useState } from 'react';
import { MessageCircle, CheckCircle2, DollarSign, ArrowRight } from 'lucide-react';
import { campaignService } from '../../services/campaign.service';
import { Campaign } from '../../types';
import { supabase } from '../../lib/supabase';

export const PublicCampaignPage = () => {
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);
    const [selectedValue, setSelectedValue] = useState<number | null>(null);
    const [leadName, setLeadName] = useState('');
    const [leadPhone, setLeadPhone] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('campaign_id');
        if (id) {
            const camp = campaignService.getCampaignById(id);
            if (camp) {
                setCampaign(camp);
                // Registrar clique
                campaignService.trackClick(id);
            }
        }
        setLoading(false);
    }, []);

    const handleSimulate = async () => {
        if (!campaign || !selectedValue || !leadName || !leadPhone) return;

        // Salvar Lead no Supabase (tabela 'leads')
        try {
            const { error } = await supabase.from('leads').insert({
                campaign_id: campaign.id,
                nome: leadName,
                whatsapp: leadPhone.replace(/\D/g, ''),
                requested_amount: selectedValue,
                status: 'NOVO'
            });

            if (error) throw error;

            // Incrementar contador local
            campaignService.trackLead(campaign.id);

            // Redirecionar para WhatsApp
            const msg = campaign.messageTemplate
                .replace('{NOME}', leadName)
                .replace('{VALOR}', selectedValue.toString())
                .replace('{LINK}', window.location.href)
                .replace('{CAMPANHA}', campaign.name);
            
            window.location.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        } catch (e) {
            alert('Erro ao processar. Tente novamente.');
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Carregando...</div>;

    if (!campaign) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Campanha não encontrada.</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
            <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="relative z-10 flex-1 flex flex-col p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                                <DollarSign className="text-white" size={24}/>
                            </div>
                            <span className="font-black text-xl tracking-tight">Simula<span className="text-blue-500">Cred</span></span>
                        </div>
                    </div>

                    {/* Image */}
                    {campaign.imageUrl && (
                        <div className="w-full aspect-square rounded-[2rem] overflow-hidden mb-8 shadow-2xl border border-slate-800 relative group">
                            <img src={campaign.imageUrl} alt={campaign.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
                            <div className="absolute bottom-6 left-6 right-6">
                                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase rounded-full mb-2 inline-block shadow-lg">Oferta Especial</span>
                                <h1 className="text-2xl font-black leading-tight">{campaign.description || 'Crédito rápido e fácil para você.'}</h1>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 flex flex-col">
                        {step === 1 ? (
                            <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-500">
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                                        <CheckCircle2 size={20} className="text-emerald-500"/>
                                        Escolha o Valor
                                    </h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        {campaign.values.map(val => (
                                            <button 
                                                key={val}
                                                onClick={() => setSelectedValue(val)}
                                                className={`p-4 rounded-2xl border transition-all font-black text-lg ${selectedValue === val ? 'bg-blue-600 border-blue-500 text-white shadow-xl scale-105' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'}`}
                                            >
                                                R$ {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => selectedValue && setStep(2)}
                                    disabled={!selectedValue}
                                    className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl mt-4 flex items-center justify-center gap-2"
                                >
                                    Continuar <ArrowRight size={18}/>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight mb-1">Quase lá!</h2>
                                    <p className="text-slate-400 text-sm mb-6">Preencha seus dados para receber a simulação no WhatsApp.</p>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Seu Nome</label>
                                            <input 
                                                type="text" 
                                                value={leadName}
                                                onChange={e => setLeadName(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-colors font-bold"
                                                placeholder="Como podemos te chamar?"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">WhatsApp</label>
                                            <input 
                                                type="tel" 
                                                value={leadPhone}
                                                onChange={e => setLeadPhone(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-colors font-bold"
                                                placeholder="(00) 00000-0000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleSimulate}
                                    disabled={!leadName || !leadPhone}
                                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-2"
                                >
                                    <MessageCircle size={20}/> Solicitar no WhatsApp
                                </button>
                                
                                <button onClick={() => setStep(1)} className="w-full py-2 text-slate-500 text-xs font-bold uppercase hover:text-white">
                                    Voltar
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Seguro • Rápido • Digital</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
