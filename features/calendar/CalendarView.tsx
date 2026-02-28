
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  Search, 
  CheckCircle2, 
  Calendar as CalIcon,
  Bell,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  MessageCircle,
  BellRing,
  Activity,
  CalendarDays,
  CalendarCheck
} from 'lucide-react';
import { useCalendar } from './hooks/useCalendar';
import { UserProfile } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { notificationService } from '../../services/notification.service';

interface CalendarViewProps {
    activeUser: UserProfile | null;
    showToast: (msg: string, type?: any) => void;
    onClose: () => void;
    onSystemAction: (actionType: string, meta: any) => void;
}

type FilterType = 'HOJE' | 'SEMANA' | 'MES' | 'TODOS';
type ViewMode = 'AGENDA' | 'RAIO_X';

export const CalendarView: React.FC<CalendarViewProps> = ({ activeUser, showToast, onClose, onSystemAction }) => {
    const { events, isLoading, addEvent, refreshEvents } = useCalendar(activeUser, showToast);
    const [filter, setFilter] = useState<FilterType>('HOJE');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('AGENDA');
    const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

    // Normalizing events into agendaItems
    const agendaItems = useMemo(() => {
        return events.map(ev => ({
            id: ev.id,
            date: new Date(ev.start_time),
            title: ev.meta?.clientName || ev.title || 'Cliente',
            subtitle: ev.description || 'Parcela',
            status: ev.status,
            type: ev.type,
            priority: ev.priority,
            loanId: ev.meta?.loanId,
            installmentId: ev.meta?.installmentId,
            clientName: ev.meta?.clientName || ev.title,
            clientPhone: ev.meta?.clientPhone,
            amount: ev.meta?.amount || 0,
            meta: ev.meta
        }));
    }, [events]);

    // Notificação automática para vencidos
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lateItems = agendaItems.filter(item => {
            const d = new Date(item.date);
            d.setHours(0, 0, 0, 0);
            return (item.status === 'OVERDUE' || d < today) && !notifiedIds.has(item.id);
        });

        if (lateItems.length > 0) {
            const newNotified = new Set(notifiedIds);
            lateItems.forEach(item => {
                newNotified.add(item.id);
                notificationService.notify(
                    `Parcela Vencida: ${item.clientName}`,
                    `${item.subtitle} - ${formatMoney(item.amount)}`,
                    () => onSystemAction('PAYMENT', item.meta)
                );
            });
            setNotifiedIds(newNotified);
        }
    }, [agendaItems]);

    // Raio-X Geral
    const raioX = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const next7 = new Date(today);
        next7.setDate(next7.getDate() + 7);

        const installments = agendaItems.filter(i => i.type === 'SYSTEM_INSTALLMENT');

        const late = installments.filter(i => i.status === 'OVERDUE');
        const dueToday = installments.filter(i => i.status === 'DUE_TODAY');
        const dueSoon = installments.filter(i => i.status === 'DUE_SOON');
        const upcoming = installments.filter(i => i.status === 'UPCOMING');

        const totalLate = late.reduce((s, i) => s + i.amount, 0);
        const totalToday = dueToday.reduce((s, i) => s + i.amount, 0);
        const totalSoon = dueSoon.reduce((s, i) => s + i.amount, 0);
        const totalUpcoming = upcoming.reduce((s, i) => s + i.amount, 0);

        return { 
            late, dueToday, dueSoon, upcoming,
            totalLate, totalToday, totalSoon, totalUpcoming,
            totalCount: installments.length 
        };
    }, [agendaItems]);

    // Filtering logic
    const filteredItems = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        return agendaItems.filter(item => {
            const itemDay = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate());
            const matchesSearch = !searchTerm || 
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.subtitle.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            switch (filter) {
                case 'HOJE': return itemDay.getTime() === today.getTime() || item.status === 'OVERDUE';
                case 'SEMANA': return (itemDay >= today && itemDay <= next7Days) || item.status === 'OVERDUE';
                case 'MES': return (itemDay >= today && itemDay <= endOfMonth) || item.status === 'OVERDUE';
                case 'TODOS': default: return true;
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
                if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
                if (a.status !== 'OVERDUE' && b.status === 'OVERDUE') return 1;
                return a.date.getTime() - b.date.getTime();
            })
        }));
    }, [filteredItems]);

    const getDayLabel = (date: Date) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const d = new Date(date); d.setHours(0, 0, 0, 0);
        if (d.getTime() === today.getTime()) return 'Hoje';
        if (d.getTime() === tomorrow.getTime()) return 'Amanhã';
        return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
    };

    // Gerar Lembrete
    const handleCreateReminder = async (item: typeof agendaItems[0]) => {
        const reminderDate = new Date(item.date);
        reminderDate.setDate(reminderDate.getDate() - 1);
        
        await addEvent({
            title: `LEMBRETE: ${item.clientName}`,
            description: `Cobrar ${item.subtitle} - ${formatMoney(item.amount)}`,
            start_time: reminderDate.toISOString(),
            end_time: reminderDate.toISOString(),
            is_all_day: true,
            type: 'REMINDER',
            status: 'PENDING',
            priority: 'HIGH',
            meta: { ...item.meta }
        });
        showToast('Lembrete criado para 1 dia antes do vencimento', 'success');
    };

    const handleWhatsApp = (item: typeof agendaItems[0]) => {
        const phone = item.clientPhone?.replace(/\D/g, '');
        if (!phone) { showToast('Telefone não disponível', 'error'); return; }
        const text = `Olá ${item.clientName}, este é um lembrete sobre sua parcela de ${formatMoney(item.amount)} com vencimento em ${item.date.toLocaleDateString('pt-BR')}. Entre em contato para regularizar.`;
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, '_blank');
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode(viewMode === 'AGENDA' ? 'RAIO_X' : 'AGENDA')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                            viewMode === 'RAIO_X'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                        }`}
                    >
                        {viewMode === 'RAIO_X' ? 'Agenda' : 'Raio-X'}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4">
                {viewMode === 'RAIO_X' ? (
                    <div className="space-y-6 animate-in zoom-in duration-300">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-[2rem] shadow-xl">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <AlertTriangle className="text-rose-500" size={14}/> Vencidos
                                </p>
                                <p className="text-xl font-black text-white">{formatMoney(raioX.totalLate)}</p>
                                <p className="text-[9px] text-rose-500 font-bold uppercase mt-1">{raioX.late.length} contratos</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-[2rem] shadow-xl">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Clock className="text-amber-500" size={14}/> Hoje
                                </p>
                                <p className="text-xl font-black text-white">{formatMoney(raioX.totalToday)}</p>
                                <p className="text-[9px] text-amber-500 font-bold uppercase mt-1">{raioX.dueToday.length} contratos</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-[2rem] shadow-xl">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <CalendarDays className="text-blue-500" size={14}/> Próx. 7 Dias
                                </p>
                                <p className="text-xl font-black text-white">{formatMoney(raioX.totalSoon)}</p>
                                <p className="text-[9px] text-blue-500 font-bold uppercase mt-1">{raioX.dueSoon.length} contratos</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-[2rem] shadow-xl">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <CalendarCheck className="text-slate-500" size={14}/> Total Ativo
                                </p>
                                <p className="text-xl font-black text-white">{formatMoney(raioX.totalUpcoming + raioX.totalSoon + raioX.totalToday + raioX.totalLate)}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{raioX.totalCount} parcelas</p>
                            </div>
                        </div>
                        
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl">
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Activity size={14} className="text-purple-500"/> Saúde da Carteira
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                                        <span className="text-slate-500">Inadimplência</span>
                                        <span className="text-rose-500">{Math.round((raioX.late.length / (raioX.totalCount || 1)) * 100)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-rose-500 rounded-full" 
                                            style={{ width: `${(raioX.late.length / (raioX.totalCount || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {(['HOJE', 'SEMANA', 'MES', 'TODOS'] as FilterType[]).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                                        filter === f 
                                            ? 'bg-white text-slate-950 border-white shadow-lg shadow-white/10' 
                                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="BUSCAR NA AGENDA..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors uppercase tracking-wider"
                            />
                        </div>

                        {/* Agenda List */}
                        <div className="space-y-8">
                            {groupedItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                                    <CalIcon size={48} className="mb-4 opacity-20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum compromisso</p>
                                </div>
                            ) : (
                                groupedItems.map(group => (
                                    <div key={group.date.toISOString()} className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-px flex-1 bg-slate-800"></div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                {getDayLabel(group.date)}
                                            </span>
                                            <div className="h-px flex-1 bg-slate-800"></div>
                                        </div>
                                        <div className="space-y-3">
                                            {group.items.map(item => (
                                                <div 
                                                    key={item.id}
                                                    className={`bg-slate-900 border p-4 rounded-[2rem] transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                                        item.status === 'OVERDUE' ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-800'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-lg ${
                                                                item.status === 'OVERDUE' ? 'bg-rose-500 shadow-rose-900/20' : 'bg-slate-800'
                                                            }`}>
                                                                {getInitials(item.title)}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-black text-white uppercase tracking-wider">{item.title}</h4>
                                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{item.subtitle}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-white">{formatMoney(item.amount)}</p>
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                                item.status === 'OVERDUE' ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-800 text-slate-400'
                                                            }`}>
                                                                {item.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleWhatsApp(item)}
                                                                className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                                                                title="WhatsApp"
                                                            >
                                                                <MessageCircle size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleCreateReminder(item)}
                                                                className="p-2 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                                                                title="Gerar Lembrete"
                                                            >
                                                                <BellRing size={16} />
                                                            </button>
                                                        </div>
                                                        <button 
                                                            onClick={() => onSystemAction('PAYMENT', item.meta)}
                                                            className="px-4 py-2 bg-slate-800 text-white text-[10px] font-black uppercase rounded-xl hover:bg-white hover:text-slate-950 transition-all"
                                                        >
                                                            Baixar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
