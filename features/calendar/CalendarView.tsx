
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar as CalIcon,
  MessageSquare,
  DollarSign,
  ArrowRight,
  X
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

type FilterType = 'ATRASADOS' | 'HOJE' | 'PROXIMOS_7_DIAS' | 'TODOS';

export const CalendarView: React.FC<CalendarViewProps> = ({ activeUser, showToast, onClose, onSystemAction }) => {
    const { events, isLoading } = useCalendar(activeUser, showToast);
    const [filter, setFilter] = useState<FilterType>('HOJE');
    const [searchTerm, setSearchTerm] = useState('');

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Filtering logic
    const filteredEvents = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);

        return events.filter(event => {
            const eventDate = new Date(event.start_time);
            const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

            // Search filter
            const matchesSearch = !searchTerm || 
                event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.description?.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            switch (filter) {
                case 'ATRASADOS':
                    return event.status === 'LATE' || eventDay < today;
                case 'HOJE':
                    return eventDay.getTime() === today.getTime();
                case 'PROXIMOS_7_DIAS':
                    return eventDay >= today && eventDay <= next7Days;
                case 'TODOS':
                default:
                    return true;
            }
        });
    }, [events, filter, searchTerm]);

    // Grouping logic
    const groupedEvents = useMemo(() => {
        const groups: Record<string, typeof events> = {};
        filteredEvents.forEach(event => {
            const date = new Date(event.start_time);
            const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const key = day.toISOString();
            if (!groups[key]) groups[key] = [];
            groups[key].push(event);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        return sortedKeys.map(key => ({
            date: new Date(key),
            events: groups[key].sort((a, b) => {
                // Prioritize: URGENT > LATE > HIGH > MEDIUM > LOW
                const priorityMap = { 'URGENT': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
                const aPrio = priorityMap[a.priority as keyof typeof priorityMap] ?? 99;
                const bPrio = priorityMap[b.priority as keyof typeof priorityMap] ?? 99;
                if (aPrio !== bPrio) return aPrio - bPrio;
                
                // Then by status
                if (a.status === 'LATE' && b.status !== 'LATE') return -1;
                if (a.status !== 'LATE' && b.status === 'LATE') return 1;
                
                return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
            })
        }));
    }, [filteredEvents]);

    const handleWhatsApp = (e: React.MouseEvent, phone: string, name: string, type: string) => {
        e.stopPropagation();
        if (!phone) { showToast('Telefone não cadastrado', 'error'); return; }
        const num = phone.replace(/\D/g, '');
        const text = type === 'LATE' 
            ? `Olá *${name}*, notamos uma pendência no seu contrato. Podemos ajudar a regularizar?`
            : `Olá *${name}*, passando para lembrar do vencimento da sua parcela hoje.`;
        window.open(`https://wa.me/55${num}?text=${encodeURIComponent(text)}`, '_blank');
    };

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

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-300 font-sans h-[100dvh]">
            {/* Header - Estilo Central de Atendimento */}
            <div className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-900/50">
                        <CalIcon size={20} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm font-black text-white uppercase tracking-wider leading-none">Central de Antecipação</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
                            {filteredEvents.length} itens encontrados
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="md:hidden p-2.5 bg-slate-900 text-slate-400 border border-slate-800 rounded-xl transition-all"
                    >
                        <Filter size={18} />
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2.5 bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-950/30 hover:border-rose-900 border border-slate-800 rounded-xl transition-all group"
                    >
                        <X size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar de Filtros - Desktop e Mobile (Overlay) */}
                <div className={`
                    absolute md:relative inset-y-0 left-0 z-30 w-72 bg-slate-950 border-r border-slate-800 transform transition-transform duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="p-4 space-y-6">
                        {/* Search Bar */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Buscar Cliente</label>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16}/>
                                <input 
                                    type="text" 
                                    placeholder="Nome ou descrição..." 
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Filter Chips */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Período</label>
                            <div className="flex flex-col gap-2">
                                {[
                                    { id: 'ATRASADOS', label: 'Atrasados', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                                    { id: 'HOJE', label: 'Hoje', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                                    { id: 'PROXIMOS_7_DIAS', label: 'Próximos 7 Dias', icon: CalIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                    { id: 'TODOS', label: 'Todos os Registros', icon: Filter, color: 'text-slate-400', bg: 'bg-slate-800' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => {
                                            setFilter(f.id as FilterType);
                                            if (window.innerWidth < 768) setIsSidebarOpen(false);
                                        }}
                                        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                            filter === f.id 
                                            ? `${f.bg} ${f.color} border-${f.color.split('-')[1]}-500/30 shadow-lg` 
                                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <f.icon size={14} />
                                            {f.label}
                                        </div>
                                        {filter === f.id && <ArrowRight size={12} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Resumo Rápido */}
                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                            <div className="flex items-center gap-2 mb-3">
                                <DollarSign size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Resumo do Filtro</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Total Itens:</span>
                                    <span className="text-xs font-black text-white">{filteredEvents.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Volume Total:</span>
                                    <span className="text-xs font-black text-emerald-500">
                                        {formatMoney(filteredEvents.reduce((acc, ev) => acc + (ev.meta?.amount || 0), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Close Button for Sidebar */}
                    {isSidebarOpen && (
                        <button 
                            onClick={() => setIsSidebarOpen(false)}
                            className="md:hidden absolute top-4 right-[-50px] p-2 bg-slate-900 text-white rounded-full border border-slate-800 shadow-xl"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Main Content - Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/50 relative">
                    {/* Overlay for mobile when sidebar is open */}
                    {isSidebarOpen && (
                        <div 
                            className="md:hidden absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-20 animate-in fade-in duration-300"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Sincronizando Agenda...</p>
                            </div>
                        ) : groupedEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-4 border border-slate-800 shadow-xl">
                                    <CheckCircle2 size={40} className="opacity-20 text-emerald-500"/>
                                </div>
                                <p className="text-sm font-black uppercase tracking-widest text-white">Tudo em dia!</p>
                                <p className="text-xs mt-2 opacity-60 max-w-[200px] text-center">Nenhum item pendente para este filtro.</p>
                            </div>
                        ) : (
                            <div className="space-y-10 pb-20">
                                {groupedEvents.map((group) => (
                                    <div key={group.date.toISOString()} className="space-y-4">
                                        <div className="flex items-center gap-4 sticky top-0 z-10 py-2 bg-slate-950/80 backdrop-blur-md -mx-4 px-4 sm:-mx-8 sm:px-8">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                                                {getDayLabel(group.date)}
                                            </h3>
                                            <div className="h-px bg-slate-800/50 flex-1"></div>
                                            <span className="text-[10px] font-mono text-slate-600">{group.events.length} itens</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {group.events.map((ev) => {
                                                const isLate = ev.status === 'LATE' || new Date(ev.start_time) < new Date(new Date().setHours(0,0,0,0));
                                                const isUrgent = ev.priority === 'URGENT';
                                                
                                                return (
                                                    <div 
                                                        key={ev.id} 
                                                        onClick={() => onSystemAction('PAYMENT', ev.meta)}
                                                        className={`group relative bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/50 transition-all cursor-pointer shadow-sm hover:shadow-blue-900/20 animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                                    >
                                                        {/* Status Indicator Bar */}
                                                        <div className={`absolute left-0 top-5 bottom-5 w-1 rounded-r-full ${
                                                            isUrgent ? 'bg-emerald-500' : isLate ? 'bg-rose-500' : 'bg-amber-500'
                                                        }`} />

                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <h4 className="font-black text-white text-base truncate uppercase tracking-tight">
                                                                        {ev.title}
                                                                    </h4>
                                                                    {isUrgent && (
                                                                        <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
                                                                            Portal
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                                    <Clock size={10} />
                                                                    {ev.description}
                                                                </div>
                                                            </div>
                                                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 bg-slate-950/50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-800 sm:border-0">
                                                                <p className={`text-lg font-black ${isLate ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                    {formatMoney(ev.meta?.amount || 0)}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">
                                                                    Vencimento: {new Date(ev.start_time).toLocaleDateString('pt-BR')}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                                                            <div className="flex items-center gap-3">
                                                                {ev.meta?.clientPhone && (
                                                                    <button 
                                                                        onClick={(e) => handleWhatsApp(e, ev.meta?.clientPhone!, ev.meta?.clientName!, isLate ? 'LATE' : 'REMINDER')}
                                                                        className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                                                                    >
                                                                        <MessageSquare size={14} />
                                                                        WhatsApp
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onSystemAction('OPEN_CHAT', { loanId: ev.meta?.loanId });
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-500 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
                                                                >
                                                                    <MessageSquare size={14} />
                                                                    Chat
                                                                </button>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-3">
                                                                {isLate && (
                                                                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 text-rose-500 rounded-lg border border-rose-500/20">
                                                                        <AlertCircle size={12} />
                                                                        <span className="text-[9px] font-black uppercase">Atrasado</span>
                                                                    </div>
                                                                )}
                                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                                    <ArrowRight size={16} />
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
            </div>
        </div>
    );
};

