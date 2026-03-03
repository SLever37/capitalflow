
import React from 'react';
import { formatMoney } from '../utils/formatters';
import { ChevronRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  rawValue?: number;
  icon: React.ReactNode;
  trend?: string; // Mantido para compatibilidade, mas renderizado no footer se fornecido
  trendColor?: string;
  onClick?: () => void;
  target?: number;
  current?: number;
  isStealthMode?: boolean;
  
  // Novos Props para Layout Rico
  footer?: React.ReactNode;
  indicatorColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
    title, value, rawValue, icon, trend, trendColor, onClick, target, current, isStealthMode, footer, indicatorColor = 'bg-blue-500' 
}) => {
  const progress = target && target > 0 && current !== undefined ? Math.min(100, (current / target) * 100) : 0;
  
  const displayValue = isStealthMode && rawValue !== undefined 
    ? formatMoney(rawValue, true) 
    : isStealthMode ? "R$ ••••" : value;

  return (
    <div 
      className={`relative overflow-hidden bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] hover:border-slate-700 transition-all duration-300 group cursor-default h-full flex flex-col justify-between`}
      onClick={onClick}
    >
        {/* Background Glow Effect */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 ${indicatorColor} rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity`}></div>

        <div>
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl bg-slate-950 border border-slate-800/50 text-slate-400 shadow-sm`}>
                        {icon}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
                </div>
                {onClick && <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />}
            </div>

            {/* Value */}
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight my-3">{displayValue}</h3>
        </div>

        {/* Footer / Context Block */}
        <div className="mt-auto space-y-3">
            {/* Progress Bar (if target exists) */}
            {target !== undefined && target > 0 && (
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                        <span>Meta: {Math.round(progress)}%</span>
                        <span className="opacity-50">{isStealthMode ? 'Alvo: •••' : `Alvo: ${formatMoney(target)}`}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                        <div className={`h-full rounded-full transition-all duration-1000 ${indicatorColor.replace('bg-', 'bg-')}`} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            {/* Custom Footer Info */}
            {footer && (
                <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-3 flex items-center justify-between gap-3 backdrop-blur-sm">
                    {footer}
                </div>
            )}
        </div>
    </div>
  );
};
