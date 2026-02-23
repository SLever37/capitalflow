
import React from 'react';
import { LayoutGrid, X, User, Calendar, Calculator, ArrowRightLeft, Shield, Scale, Wallet, Briefcase, Users, LayoutDashboard, PiggyBank, Settings, MessageCircle, Megaphone } from 'lucide-react';
import { AppTab } from '../types';

interface NavHubProps {
    onClose: () => void;
    onNavigate: (tab: string, modal?: string) => void;
    userLevel: number;
    hubOrder: AppTab[];
    unreadCampaignCount?: number;
}

export const NavHub: React.FC<NavHubProps> = ({ onClose, onNavigate, userLevel, hubOrder, unreadCampaignCount = 0 }) => {
    const getTabMeta = (tab: AppTab) => {
        switch (tab) {
            case 'PROFILE': return { icon: <User size={32}/>, label: 'Meu Perfil', color: 'text-blue-500', hover: 'hover:border-blue-600' };
            case 'SOURCES': return { icon: <Wallet size={32}/>, label: 'Meus Fundos', color: 'text-emerald-500', hover: 'hover:border-emerald-600' };
            case 'LEGAL': return { icon: <Scale size={32}/>, label: 'Jurídico', color: 'text-indigo-500', hover: 'hover:border-indigo-600' };
            case 'MASTER': return { icon: <Shield size={32}/>, label: 'SAC', color: 'text-rose-500', hover: 'hover:border-rose-600' };
            case 'TEAM': return { icon: <Briefcase size={32}/>, label: 'Minha Equipe', color: 'text-purple-500', hover: 'hover:border-purple-600' };
            case 'CLIENTS': return { icon: <Users size={32}/>, label: 'Clientes', color: 'text-amber-500', hover: 'hover:border-amber-600' };
            case 'DASHBOARD': return { icon: <LayoutDashboard size={32}/>, label: 'Painel Geral', color: 'text-cyan-500', hover: 'hover:border-cyan-600' };
            case 'PERSONAL_FINANCE': return { icon: <PiggyBank size={32}/>, label: 'Minhas Finanças', color: 'text-pink-500', hover: 'hover:border-pink-600' };
            case 'SETTINGS': return { icon: <Settings size={32}/>, label: 'Ajustes', color: 'text-slate-400', hover: 'hover:border-slate-500' };
            case 'LEADS': return { icon: <MessageCircle size={32}/>, label: 'Leads', color: 'text-green-500', hover: 'hover:border-green-600' };
            case 'ACQUISITION': return { icon: <Megaphone size={32}/>, label: 'Captação', color: 'text-orange-500', hover: 'hover:border-orange-600' };
            default: return { icon: <LayoutGrid size={32}/>, label: tab, color: 'text-slate-500', hover: 'hover:border-slate-600' };
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-sm relative">
                <button onClick={onClose} className="absolute -top-12 right-0 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white"><X/></button>
                <div className="flex justify-center items-center mb-8">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><LayoutGrid className="text-blue-500"/> Hub Central</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {hubOrder.map(tab => {
                        const meta = getTabMeta(tab);
                        if (tab === 'MASTER' && userLevel !== 1) return null;
                        return (
                            <button key={tab} onClick={() => onNavigate(tab)} className={`p-6 bg-slate-900 border border-slate-800 rounded-3xl transition-all group flex flex-col items-center justify-center gap-3 relative ${meta.hover}`}>
                                <div className={`p-4 bg-slate-800 rounded-2xl ${meta.color} group-hover:scale-110 transition-transform`}>{meta.icon}</div>
                                <span className="font-bold text-white uppercase text-xs tracking-widest text-center">{meta.label}</span>
                                {tab === 'ACQUISITION' && unreadCampaignCount > 0 && (
                                    <span className="absolute top-4 right-4 bg-rose-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full ring-4 ring-slate-900 animate-bounce shadow-lg shadow-rose-500/50">
                                        {unreadCampaignCount > 99 ? '99+' : unreadCampaignCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    
                    {/* Atalhos fixos de utilitários - Agora com o mesmo estilo dos botões de navegação */}
                    <button onClick={() => onNavigate('DASHBOARD', 'AGENDA')} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl transition-all group flex flex-col items-center justify-center gap-3 hover:border-purple-600">
                        <div className="p-4 bg-slate-800 rounded-2xl text-purple-500 group-hover:scale-110 transition-transform">
                            <Calendar size={32}/>
                        </div>
                        <span className="font-bold text-white uppercase text-xs tracking-widest text-center">Agenda</span>
                    </button>
                    <button onClick={() => onNavigate('DASHBOARD', 'CALC')} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl transition-all group flex flex-col items-center justify-center gap-3 hover:border-blue-400">
                        <div className="p-4 bg-slate-800 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                            <Calculator size={32}/>
                        </div>
                        <span className="font-bold text-white uppercase text-xs tracking-widest text-center">Simulador</span>
                    </button>
                </div>
            </div>
        </div>
    );
};