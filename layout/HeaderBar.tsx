
import React, { useRef, useState, useEffect } from 'react';
import { TrendingUp, Plus, Loader2, LayoutGrid, Eye, EyeOff, Users, LayoutDashboard, Wallet, Briefcase, PiggyBank, Calendar, Calculator, ArrowRightLeft, MessageCircle, Megaphone, User, Menu, BellRing, X } from 'lucide-react';
import { UserProfile } from '../types';
import { Tooltip } from '../components/ui/Tooltip';
import { InAppNotification } from '../hooks/useAppNotifications';
import { resolveNotificationTarget } from '../utils/notificationRouting';
import { motion, AnimatePresence } from 'motion/react';

import { supabase } from '../lib/supabase';

interface HeaderBarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  activeUser: UserProfile | null;
  isLoadingData: boolean;
  onOpenNav: () => void;
  onNewLoan: () => void;
  isStealthMode: boolean;
  toggleStealthMode: () => void;
  navOrder: string[];
  notifications?: InAppNotification[];
  removeNotification?: (id: string) => void;
  onNavigate?: (path: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ 
  activeTab, setActiveTab, activeUser, isLoadingData, onOpenNav, onNewLoan, isStealthMode, toggleStealthMode, navOrder, notifications, removeNotification, onNavigate
}) => {
  const scrollRef = useRef<HTMLElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!scrollRef.current || e.pointerType !== 'mouse') return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !scrollRef.current || e.pointerType !== 'mouse') return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll-fast
    if (Math.abs(walk) > 10) {
        setHasDragged(true);
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'DASHBOARD': return <LayoutDashboard size={14} className="text-blue-500"/>;
      case 'CLIENTS': return <Users size={14} className="text-indigo-500"/>;
      case 'TEAM': return <Briefcase size={14} className="text-amber-500"/>;
      case 'SOURCES': return <Wallet size={14} className="text-emerald-500"/>;
      case 'PERSONAL_FINANCE': return <PiggyBank size={14} className="text-pink-500"/>;
      case 'AGENDA': return <Calendar size={14} className="text-purple-500"/>;
      case 'SIMULATOR': return <Calculator size={14} className="text-blue-400"/>;
      case 'FLOW': return <ArrowRightLeft size={14} className="text-teal-500"/>;
      case 'ACQUISITION': return <Megaphone size={14} className="text-orange-400"/>;
      case 'PROFILE': return <User size={14} className="text-blue-400"/>;
      case 'HUB': return <Menu size={14} className="text-slate-400"/>;
      default: return null;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'DASHBOARD': return 'Painel';
      case 'CLIENTS': return 'Clientes';
      case 'TEAM': return 'Equipe';
      case 'SOURCES': return 'Capital';
      case 'PERSONAL_FINANCE': return 'Finanças';
      case 'AGENDA': return 'Agenda';
      case 'SIMULATOR': return 'Simulador';
      case 'FLOW': return 'Extrato';
      case 'ACQUISITION': return 'Captação';
      case 'PROFILE': return 'Perfil';
      case 'HUB': return 'Menu';
      default: return tab;
    }
  };

  // Branding Colors
  const primaryColor = activeUser?.brandColor || '#2563eb';

  const sortedNotifications = [...(notifications || [])].sort((a, b) => {
    if (a.isPersistent && !b.isPersistent) return -1;
    if (!a.isPersistent && b.isPersistent) return 1;
    
    const aUrgent = Date.now() - a.createdAt > 86400000;
    const bUrgent = Date.now() - b.createdAt > 86400000;
    
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    
    return b.createdAt - a.createdAt;
  });

  const NotificationDropdown = () => (
    <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-h-[80vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[999] p-2 overflow-x-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-2">
        <span className="font-bold text-sm text-white">Notificações</span>
        {notifications && notifications.length > 0 && (
          <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">{notifications.length}</span>
        )}
      </div>
      {sortedNotifications.length === 0 ? (
        <div className="p-4 text-center text-slate-500 text-sm">Nenhuma notificação</div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {sortedNotifications.map(n => (
              <motion.div 
                key={n.id}
                initial={{ rotateX: 90, opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ rotateX: 0, opacity: 1, height: 'auto', marginBottom: 8 }}
                exit={{ x: 300, opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, { offset, velocity }) => {
                  if (offset.x > 100 || offset.x < -100 || velocity.x > 500 || velocity.x < -500) {
                    removeNotification?.(n.id);
                  }
                }}
                className={`p-3 rounded-xl border relative group cursor-grab active:cursor-grabbing ${n.type === 'error' ? 'bg-rose-500/10 border-rose-500/20' : n.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800 border-slate-700'}`}
              >
                <div className="pr-6 cursor-pointer" onClick={async () => { 
                  try {
                    // Tenta marcar como lida no backend (ignora erro se for notificação local)
                    await supabase.rpc('mark_notification_as_read', { notification_id: n.id });
                  } catch (e) {
                    console.error('Failed to mark notification as read', e);
                  }

                  if (n.onClick) {
                    n.onClick();
                  } else if (onNavigate) {
                    const target = resolveNotificationTarget(n);
                    onNavigate(target);
                  }
                  setShowNotifications(false); 
                }}>
                  <div className="flex items-center gap-2 mb-1">
                    {n.isPersistent && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                    {(Date.now() - n.createdAt > 86400000) && !n.isPersistent && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                    <h4 className={`text-xs font-bold ${n.type === 'error' ? 'text-rose-400' : n.type === 'warning' ? 'text-amber-400' : 'text-blue-400'}`}>{n.title}</h4>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">{n.message}</p>
                  <span className="text-[9px] text-slate-500 mt-2 block">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeNotification?.(n.id); }}
                  className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Remover notificação"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 pt-safe relative">
      {/* Textura de fundo sutil */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=')]"></div>
      
      <div className="max-w-[1600px] mx-auto px-4 min-h-[4rem] sm:min-h-[5rem] py-2 sm:py-3 flex flex-wrap items-center justify-between gap-y-3 relative z-10">
        <div className="flex items-center justify-between w-full md:w-auto gap-3 sm:gap-6">
           <div className="hidden md:flex items-center">
              <button onClick={onOpenNav} className="p-2.5 bg-slate-900 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl transition-all shadow-lg group">
                  <Menu size={22} className="group-hover:scale-110 transition-transform"/>
              </button>
           </div>
           <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('DASHBOARD')}>
              <div 
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-lg transition-transform flex-shrink-0 group-hover:scale-110"
                style={{ backgroundColor: primaryColor }}
              >
                  {activeUser?.logoUrl ? <img src={activeUser.logoUrl} className="w-6 h-6 object-contain"/> : <TrendingUp className="text-white w-5 h-5 sm:w-6 sm:h-6" />}
              </div>
              <div>
                <h1 className="text-base sm:text-2xl font-black tracking-tighter uppercase leading-none text-white">
                    Capital<span style={{ color: primaryColor }}>Flow</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-emerald-500 animate-pulse font-extrabold uppercase tracking-widest mt-0.5">
                    Olá, {activeUser?.name?.split(' ')[0] || 'Gestor'}
                </p>
              </div>
           </div>
           
           <div className="flex items-center gap-3 md:hidden">
               <button onClick={toggleStealthMode} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isStealthMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  {isStealthMode ? <EyeOff size={18}/> : <Eye size={18}/>}
               </button>
               
               <div className="relative" ref={dropdownRef}>
                 <button 
                   onClick={() => setShowNotifications(!showNotifications)}
                   className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${showNotifications ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                 >
                   <BellRing size={18} className={notifications?.length ? 'animate-pulse text-amber-400' : ''} />
                   {notifications && notifications.length > 0 && (
                     <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-slate-950">
                       {notifications.length > 9 ? '9+' : notifications.length}
                     </span>
                   )}
                 </button>
                 {showNotifications && <NotificationDropdown />}
               </div>

               <button onClick={() => setActiveTab('PROFILE')} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                  {activeUser?.photo ? <img src={activeUser.photo} className="w-full h-full object-cover"/> : <span className="text-white font-bold">{activeUser?.name?.[0]}</span>}
               </button>
           </div>

           {isLoadingData && <Loader2 className="animate-spin text-blue-500 hidden md:block" />}
           <div className="h-8 w-px bg-slate-800 hidden md:block" />
           
           <div className="hidden md:flex items-center gap-4">
              <button onClick={toggleStealthMode} className={`p-3 rounded-xl transition-all shadow-lg group ${isStealthMode ? 'bg-indigo-600 text-white' : 'bg-slate-900 hover:bg-indigo-600 text-slate-400 hover:text-white'}`} title="Modo Privacidade">
                  {isStealthMode ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
              
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-3 rounded-xl transition-all shadow-lg group ${showNotifications ? 'bg-blue-600 text-white' : 'bg-slate-900 hover:bg-blue-600 text-slate-400 hover:text-white'}`}
                  title="Notificações"
                >
                  <BellRing size={20} className={notifications?.length ? 'animate-pulse text-amber-400' : ''} />
                  {notifications && notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-slate-950">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>
                {showNotifications && <NotificationDropdown />}
              </div>
           </div>
        </div>

        <nav 
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          className={`hidden md:flex w-full xl:w-auto xl:flex-1 order-last xl:order-none bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto scrollbar-hide xl:mx-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
           {(navOrder || []).map(tab => {
               // EQUIPE visível apenas para operadores principais (sem supervisor)
               if (tab === 'TEAM' && activeUser?.supervisor_id) return null;
               return (
                   <button 
                    key={tab}
                    onClick={() => {
                        if (!hasDragged) setActiveTab(tab);
                    }} 
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    style={{ backgroundColor: activeTab === tab ? primaryColor : 'transparent' }}
                   >
                     {getTabIcon(tab)} <span>{getTabLabel(tab)}</span>
                   </button>
               );
           })}
        </nav>
        
        <div className="hidden md:block shrink-0">
            <Tooltip content="Adicionar novo registro" position="bottom">
                <button 
                  onClick={onNewLoan} 
                  className="text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[160px] whitespace-nowrap"
                  style={{ backgroundColor: primaryColor }}
                >
                    <Plus className="w-5 h-5" /> Novo Contrato
                </button>
            </Tooltip>
        </div>
      </div>
    </header>
  );
};
