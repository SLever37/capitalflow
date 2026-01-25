
import React from 'react';
import { formatMoney } from '../utils/formatters';

interface StatCardProps {
  title: string;
  value: string; // Legacy string input, kept for compatibility but cleaned if formatted
  rawValue?: number; // New prop for stealth handling
  icon: React.ReactNode;
  trend?: string;
  trendColor?: string;
  onClick?: () => void;
  target?: number;
  current?: number;
  isStealthMode?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, rawValue, icon, trend, trendColor, onClick, target, current, isStealthMode }) => {
  const progress = target && target > 0 && current !== undefined ? Math.min(100, (current / target) * 100) : 0;
  
  // Se tivermos rawValue e o modo stealth estiver ativo, mascaramos.
  // Caso contrário, usamos o value string original (que já pode estar formatado, mas tentamos limpar se necessário)
  const displayValue = isStealthMode && rawValue !== undefined 
    ? formatMoney(rawValue, true) 
    : isStealthMode ? "R$ ••••" : value;

  return (
    <div 
      className={`bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-xl hover:border-blue-500/50 transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-900 rounded-xl text-blue-400">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendColor || 'bg-green-500/20 text-green-400'}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{displayValue}</h3>
        
        {target !== undefined && target > 0 && (
            <div className="mt-4">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black mb-1">
                    <span>Meta: {Math.round(progress)}%</span>
                    <span>Alvo: {isStealthMode ? '•••' : target.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
