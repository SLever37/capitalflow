
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  Search, 
  CheckCircle2, 
  Calendar as CalIcon
} from 'lucide-react';
import { useCalendar } from './hooks/useCalendar';
import { UserProfile } from '../../types';
import { formatMoney } from '../../utils/formatters';

interface CalendarViewProps {
    activeUser: UserProfile | null;
    showToast: (msg: string, type?: any) => void;
    onClose: () => void;
    onSystemAction: (actionType: string, meta: any) => void;
}

type FilterType = 'HOJE' | 'SEMANA' | 'MES' | 'TODOS';

export const CalendarView: React.FC<CalendarViewProps> = ({ activeUser, showToast, onClose, onSystemAction }) => {
    const { events, isLoading } = useCalendar(activeUser, showToast);
    const [filter, setFilter] = useState<FilterType>('HOJE');
    const [searchTerm, setSearchTerm] = useState('');

    // Normalizing events into agendaItems
    const agendaItems = useMemo(() => {
        return events.map(ev => ({
            id: ev.id,
            date: new Date(ev.start_time),
            title: ev.meta?.clientName || ev.title || 'Cliente',
            subtitle: ev.description || 'Parcela',
            status: ev.status,
            loanId: ev.meta?.loanId,
            clientName: ev.meta?.clientName || ev.title,
            amount: ev.meta?.amount || 0,
            meta: ev.meta
        }));
    }, [events]);

    // Filtering logic
    const filteredItems = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);

        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        return agendaItems.filter(item => {
            const itemDay = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate());

            // Search filter
            const matchesSearch = !searchTerm || 
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.subtitle.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            const isLate = item.status === 'LATE' || itemDay < today;

            switch (filter) {
                case 'HOJE':
                    return itemDay.getTime() === today.getTime() || isLate;
                case 'SEMANA':
                    return (itemDay >= today && itemDay <= next7Days) || isLate;
                case 'MES':
                    return (itemDay >= today && itemDay <= endOfMonth) || isLate;
                case 'TODOS':
                default:
                    return true;
            }
        });
    }, [agendaItems, filter, searchTerm]);

    // Grouping logic
    const groupedItems = useMemo(() => {
        const groups: Record<string, typeof filteredItems> = {};
        filteredItems.forEach(item => {
            const day = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate());
            const key = day.toISOString();
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        return sortedKeys.map(key => ({
            date: new Date(key),
            items: groups[key].sort((a, b) => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const aIsLate = a.status === 'LATE' || a.date < today;
                const bIsLate = b.status === 'LATE' || b.date < today;
                if (aIsLate && !bIsLate) return -1;
                if (!aIsLate && bIsLate) return 1;
                
                return a.date.getTime() - b.date.getTime();
            })
        }));
    }, [filteredItems]);

    const getDayLabel = (date: Date) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const d = new Date(date);
        d.setHours(0,0,0,0);

        if (d.getTime() === today.getTime()) return 'Hoje';
        if (d.getTime() === tomorrow.getTime()) return 'Amanhã';
        if (d.getTime() === yesterday.getTime()) return 'Ontem';

        return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
    };

    const getInitials = (name: string) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-300 font-sans h-[100dvh]">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-900/20">
                        <CalIcon size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white uppercase tracking-wider leading-none">Agenda</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
                            {filteredItems.length} itens
                        </p>
                    </div>
                </div>
            </div>

            {/* Top Bar: Search & Filters */}
            <div className="bg-slate-900 border-b border-slate-800 shrink-0 flex flex-col">
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Buscar cliente ou contrato..." 
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 pb-3 overflow-x-auto custom-scrollbar no-scrollbar">
                    {[
                        { id: 'HOJE', label: 'Hoje' },
                        { id: 'SEMANA', label: 'Semana' },
                        { id: 'MES', label: 'Mês' },
                        { id: 'TODOS', label: 'Todos' }
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id as FilterType)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border ${
                                filter === f.id 
                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' 
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content - Chat Style List */}
            <div className="flex-1 overflow-y-auto bg-slate-950">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Carregando...</p>
                    </div>
                ) : groupedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                            <CheckCircle2 size={32} className="opacity-20 text-emerald-500"/>
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-white">Tudo limpo!</p>
                        <p className="text-[10px] mt-1 opacity-60">Nenhum item pendente.</p>
                    </div>
                ) : (
                    <div className="pb-20">
                        {groupedItems.map((group) => (
                            <div key={group.date.toISOString()}>
                                <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md px-4 py-2 border-b border-slate-800/50 flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {getDayLabel(group.date)}
                                    </h3>
                                    <span className="text-[10px] font-bold text-slate-600">{group.items.length}</span>
                                </div>

                                <div className="divide-y divide-slate-800/50">
                                    {group.items.map((item) => {
                                        const today = new Date();
                                        today.setHours(0,0,0,0);
                                        const itemDay = new Date(item.date);
                                        itemDay.setHours(0,0,0,0);
                                        
                                        const isLate = item.status === 'LATE' || itemDay < today;
                                        const isToday = itemDay.getTime() === today.getTime();
                                        const isPartial = item.status === 'PARTIAL';
                                        
                                        let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
                                        let badgeText = 'FUTURO';
                                        
                                        if (isLate) {
                                            badgeColor = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
                                            badgeText = 'ATRASADO';
                                        } else if (isToday) {
                                            badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                                            badgeText = 'HOJE';
                                        } else if (isPartial) {
                                            badgeColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                                            badgeText = 'PARCIAL';
                                        }

                                        return (
                                            <div 
                                                key={item.id} 
                                                onClick={() => onSystemAction('PAYMENT', item.meta)}
                                                className="flex items-center gap-3 p-4 hover:bg-slate-900/50 transition-colors cursor-pointer active:bg-slate-900"
                                            >
                                                {/* Avatar */}
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 text-xs font-black text-slate-300 uppercase">
                                                    {getInitials(item.title)}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                        <h4 className="font-bold text-sm text-white truncate">
                                                            {item.title}
                                                        </h4>
                                                        <span className="text-xs font-black text-white shrink-0">
                                                            {formatMoney(item.amount)}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[11px] text-slate-500 truncate">
                                                            {item.subtitle}
                                                        </p>
                                                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 ${badgeColor}`}>
                                                            {badgeText}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

