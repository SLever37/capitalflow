
import React from 'react';
import { LayoutGrid, X, User, Calendar, Calculator, ArrowRightLeft, Shield, Scale } from 'lucide-react';

export const NavHub = ({ onClose, onNavigate, userLevel }: { onClose: () => void, onNavigate: (tab: string, modal?: string) => void, userLevel: number }) => (
    <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-full max-w-sm relative">
            <button onClick={onClose} className="absolute -top-12 right-0 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white"><X/></button>
            <div className="flex justify-center items-center mb-8">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><LayoutGrid className="text-blue-500"/> Hub Central</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => onNavigate('PROFILE')} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl hover:border-blue-600 transition-all group flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-slate-800 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform"><User size={32}/></div>
                    <span className="font-bold text-white uppercase text-xs tracking-widest">Meu Perfil</span>
                </button>
                <button onClick={() => onNavigate('LEGAL')} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl hover:border-indigo-600 transition-all group flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-slate-800 rounded-2xl text-indigo-500 group-hover:scale-110 transition-transform"><Scale size={32}/></div>
                    <span className="font-bold text-white uppercase text-xs tracking-widest">Jurídico</span>
                </button>
                <button onClick={() => onNavigate('DASHBOARD', 'AGENDA')} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl hover:border-purple-600 transition-all group flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-slate-800 rounded-2xl text-purple-500 group-hover:scale-110 transition-transform"><Calendar size={32}/></div>
                    <span className="font-bold text-white uppercase text-xs tracking-widest">Agenda</span>
                </button>
                <button onClick={() => onNavigate('DASHBOARD', 'CALC')} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl hover:border-emerald-600 transition-all group flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-slate-800 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform"><Calculator size={32}/></div>
                    <span className="font-bold text-white uppercase text-xs tracking-widest">Calculadora</span>
                </button>
                <button onClick={() => onNavigate('DASHBOARD', 'FLOW')} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl hover:border-orange-600 transition-all group flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-slate-800 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform"><ArrowRightLeft size={32}/></div>
                    <span className="font-bold text-white uppercase text-xs tracking-widest">Extrato</span>
                </button>
                {userLevel === 1 && (
                    <button onClick={() => onNavigate('MASTER')} className="col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-3xl hover:border-rose-600 transition-all group flex flex-col items-center justify-center gap-3">
                        <div className="p-4 bg-slate-800 rounded-2xl text-rose-500 group-hover:scale-110 transition-transform"><Shield size={32}/></div>
                        <span className="font-bold text-white uppercase text-xs tracking-widest">SAC / Gestão de Acessos</span>
                    </button>
                )}
            </div>
        </div>
    </div>
);
