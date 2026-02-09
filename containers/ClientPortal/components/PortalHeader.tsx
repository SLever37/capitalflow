
import React from 'react';
import { LogOut } from 'lucide-react';

interface PortalHeaderProps {
    loggedClient: any;
    handleLogout: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({ loggedClient, handleLogout }) => {
    return (
        <div className="bg-slate-950 border-b border-slate-800 p-5 flex items-center justify-between shrink-0 relative z-10">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-lg border-2 border-slate-900">
                    {loggedClient.name.charAt(0)}
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Portal do Cliente</p>
                    <h3 className="text-white font-bold text-sm leading-none">{loggedClient.name.split(' ')[0]}</h3>
                </div>
            </div>
            <button onClick={handleLogout} className="p-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl hover:text-white transition-colors">
                <LogOut size={18}/>
            </button>
        </div>
    );
};
