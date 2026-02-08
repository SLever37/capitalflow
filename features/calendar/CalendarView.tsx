
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ShieldAlert, MessageSquare, DollarSign, CheckCircle2, Calendar as CalIcon, X } from 'lucide-react';
import { useCalendar } from './hooks/useCalendar';
import { useCalendarComputed } from './hooks/useCalendarComputed';
import { EventModal } from './components/EventModal';
import { SmartSidebar } from './components/SmartSidebar'; 
import { UserProfile } from '../../types';

interface CalendarViewProps {
    activeUser: UserProfile | null;
    showToast: (msg: string, type?: any) => void;
    onClose: () => void;
    onSystemAction: (actionType: string, meta: any) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ activeUser, showToast, onClose, onSystemAction }) => {
    const { events, addEvent } = useCalendar(activeUser, showToast);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [targetDateForModal, setTargetDateForModal] = useState<Date>(new Date());
    const [showRadar, setShowRadar] = useState(false);
    
    // LÓGICA DE COMPUTADA EXTRAÍDA
    const { 
        dayStrip, urgentEvents, lateEvents, radarCount, dayEvents, dayTotalReceivable 
    } = useCalendarComputed(events, selectedDate);

    // Navegação
    const handleNextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };
    const handlePrevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };

    const handleWhatsApp = (e: React.MouseEvent, phone: string, name: string, type: string) => {
        e.stopPropagation();
        if (!phone) { showToast('Telefone não cadastrado', 'error'); return; }
        const num = phone.replace(/\D/g, '');
        const text = type === 'LATE' 
            ? `Olá *${name}*, notamos uma pendência no seu contrato. Podemos ajudar a regularizar?`
            : `Olá *${name}*, passando para lembrar do vencimento da sua parcela hoje.`;
        window.open(`https://wa.me/55${num}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const openNewTaskModal = (date?: Date) => {
        setTargetDateForModal(date || selectedDate);
        setIsEventModalOpen(true);
    };

    const selectedStr = selectedDate.toDateString();

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-300 font-sans">
            
            {/* --- HEADER SUPERIOR (ESTILO CHAT DE SUPORTE) --- */}
            <div className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 sm:px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-purple-900/50">
                        <CalIcon size={20}/>
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white uppercase tracking-wider leading-none">Agenda de Compromissos</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
                            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowRadar(true)} 
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border ${radarCount > 0 ? 'bg-rose-600 border-rose-500 text-white animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
                    >
                        <ShieldAlert size={14}/> 
                        Radar {radarCount > 0 && <span className="bg-white text-rose-600 px-1.5 py-0.5 rounded-full text-[9px]">{radarCount}</span>}
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2.5 bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-950/30 hover:border-rose-900 border border-slate-800 rounded-xl transition-all group"
                    >
                        <X size={18} className="group-hover:scale-110 transition-transform"/>
                    </button>
                </div>
            </div>

            {/* Day Strip Navigator (Sub-header) */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30 backdrop-blur-md z-20">

                {/* Day Strip Navigator */}
                <div className="flex items-center justify-between gap-2">
                    <button onClick={handlePrevDay} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500"><ChevronLeft size={20}/></button>
                    <div className="flex-1 grid grid-cols-7 gap-2 sm:gap-4">
                        {dayStrip.map((date, i) => {
                            const isSelected = date.toDateString() === selectedStr;
                            const isToday = date.toDateString() === new Date().toDateString();
                            const hasEvents = events.some(e => new Date(e.start_time).toDateString() === date.toDateString() && e.priority !== 'URGENT');
                            
                            return (
                                <div 
                                    key={i} 
                                    className={`relative group flex flex-col items-center justify-center p-2 rounded-xl transition-all border cursor-pointer select-none ${isSelected ? 'bg-blue-600 border-blue-500 shadow-lg scale-105' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`} 
                                    onClick={() => setSelectedDate(date)}
                                    onDoubleClick={(e) => { e.stopPropagation(); openNewTaskModal(date); }}
                                >
                                    <span className={`text-[9px] font-black uppercase mb-1 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','')}</span>
                                    <span className={`text-lg font-black ${isSelected ? 'text-white' : isToday ? 'text-blue-400' : 'text-slate-300'}`}>{date.getDate()}</span>
                                    {hasEvents && !isSelected && <div className="w-1 h-1 rounded-full bg-blue-500 mt-1"></div>}
                                    
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); openNewTaskModal(date); }}
                                        className={`absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow-sm hover:scale-110 transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                        title="Adicionar para este dia"
                                    >
                                        <Plus size={10} strokeWidth={4}/>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={handleNextDay} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500"><ChevronRight size={20}/></button>
                </div>
            </div>

            {/* --- MAIN FEED --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-900/20">
                
                {/* Stats do Dia */}
                {dayEvents.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mb-6 max-w-4xl mx-auto">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">A Receber</p>
                                <p className="text-xl font-black text-emerald-400">R$ {dayTotalReceivable.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><DollarSign size={20}/></div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tarefas</p>
                                <p className="text-xl font-black text-white">{dayEvents.length}</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><CheckCircle2 size={20}/></div>
                        </div>
                    </div>
                )}

                {/* Lista de Tarefas */}
                <div className="space-y-3 max-w-4xl mx-auto pb-10">
                    {dayEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                                <CheckCircle2 size={32} className="opacity-50"/>
                            </div>
                            <p className="text-sm font-bold uppercase tracking-widest">Dia Livre</p>
                            <p className="text-xs mt-2 opacity-60">Nenhuma tarefa agendada para {selectedDate.toLocaleDateString()}.</p>
                            <button onClick={() => openNewTaskModal()} className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase hover:bg-slate-700">Adicionar Tarefa</button>
                        </div>
                    ) : (
                        dayEvents.map(ev => (
                            <div key={ev.id} className="group bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-5 rounded-2xl transition-all cursor-pointer relative overflow-hidden" onClick={() => ev.type.startsWith('SYSTEM') ? onSystemAction('PAYMENT', ev.meta) : null}>
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-black border ${ev.type === 'SYSTEM_INSTALLMENT' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                        {ev.type === 'SYSTEM_INSTALLMENT' ? <DollarSign/> : <CalIcon/>}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-white text-base truncate">{ev.title}</h4>
                                            {ev.meta?.amount && <span className="text-sm font-black text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-500/20">R$ {ev.meta.amount.toFixed(2)}</span>}
                                        </div>
                                        <p className="text-xs text-slate-400 truncate mt-1">{ev.description}</p>
                                        
                                        <div className="flex items-center gap-3 mt-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity translate-y-2 sm:group-hover:translate-y-0 duration-300">
                                            {ev.meta?.clientPhone && (
                                                <button onClick={(e) => handleWhatsApp(e, ev.meta?.clientPhone!, ev.meta?.clientName!, 'REMINDER')} className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-500 hover:text-white hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors bg-emerald-950/20">
                                                    <MessageSquare size={12}/> Cobrar
                                                </button>
                                            )}
                                            {ev.type === 'SYSTEM_INSTALLMENT' && (
                                                <button onClick={() => onSystemAction('PAYMENT', ev.meta)} className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-500 hover:text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors bg-blue-950/20">
                                                    <DollarSign size={12}/> Receber
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- RADAR OVERLAY --- */}
            {showRadar && (
                <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md animate-in slide-in-from-right duration-300 flex justify-end">
                    <div className="w-full max-w-md h-full relative">
                        <button onClick={() => setShowRadar(false)} className="absolute top-4 right-4 z-50 p-2 bg-slate-800 rounded-full text-white"><ChevronRight/></button>
                        <SmartSidebar 
                            events={events} 
                            currentDate={selectedDate}
                            onAction={(ev) => {
                                if (ev.type === 'SYSTEM_PORTAL_REQUEST') onSystemAction('PORTAL_REVIEW', ev.meta);
                                else if (ev.type === 'SYSTEM_INSTALLMENT') onSystemAction('PAYMENT', ev.meta);
                                setShowRadar(false);
                            }}
                        />
                    </div>
                </div>
            )}

            {isEventModalOpen && (
                <EventModal 
                    onClose={() => setIsEventModalOpen(false)}
                    onSave={(evt) => { addEvent(evt); setIsEventModalOpen(false); }}
                    selectedDate={targetDateForModal}
                />
            )}
        </div>
    );
};