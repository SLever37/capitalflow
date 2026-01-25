
import { useState, useEffect, useCallback, useRef } from 'react';
import { calendarService } from '../services/calendar.service';
import { googleCalendarService } from '../services/googleCalendar.service';
import { CalendarEvent, CalendarViewMode, GoogleIntegration } from '../types';
import { UserProfile } from '../../../types';
import { playNotificationSound } from '../../../utils/notificationSound';
import { supabase } from '../../../lib/supabase';

export const useCalendar = (activeUser: UserProfile | null, showToast: (msg: string, type?: any) => void) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleIntegration | null>(null);
  
  // Filtros rápidos
  const [urgentCount, setUrgentCount] = useState(0);

  // Load Data
  const refreshEvents = useCallback(async (silent = false) => {
    if (!activeUser) return;
    if (!silent) setIsLoading(true);
    try {
      const [sysEvents, userEvents] = await Promise.all([
        calendarService.fetchSystemEvents(activeUser.id),
        calendarService.listUserEvents(activeUser.id)
      ]);
      
      const all = [...sysEvents, ...userEvents];
      setEvents(all);
      setUrgentCount(all.filter(e => e.priority === 'URGENT').length);
      
      // Load Google Status (Only once or if needed)
      // const gStatus = await googleCalendarService.getIntegrationStatus(activeUser.id);
      // setGoogleStatus(gStatus);

    } catch (e) {
      console.error(e);
      if(!silent) showToast("Erro ao carregar agenda", "error");
    } finally {
      if(!silent) setIsLoading(false);
    }
  }, [activeUser]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  // --- REALTIME LISTENER ---
  useEffect(() => {
    if (!activeUser) return;

    const channel = supabase
      .channel('calendar-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sinalizacoes_pagamento', filter: `profile_id=eq.${activeUser.id}` },
        (payload) => {
          console.log("Realtime: Nova Sinalização", payload);
          playNotificationSound();
          showToast(`🔔 Nova ação do portal!`, 'info');
          refreshEvents(true); // Silent refresh
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `profile_id=eq.${activeUser.id}` },
        () => refreshEvents(true)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeUser, refreshEvents]);

  // CRUD Wrappers
  const addEvent = async (evt: Partial<CalendarEvent>) => {
    if (!activeUser) return;
    try {
      await calendarService.createEvent(evt, activeUser.id);
      showToast("Tarefa criada!", "success");
      refreshEvents(true);
    } catch (e) { showToast("Erro ao criar", "error"); }
  };

  const updateEvent = async (id: string, evt: Partial<CalendarEvent>) => {
    try {
        await calendarService.updateEvent(id, evt);
        showToast("Atualizado!", "success");
        refreshEvents(true);
    } catch(e) { showToast("Erro ao atualizar", "error"); }
  };

  const deleteEvent = async (id: string) => {
      try {
          await calendarService.deleteEvent(id);
          showToast("Removido.", "success");
          refreshEvents(true);
      } catch(e) { showToast("Erro ao remover", "error"); }
  };

  return {
    events,
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    isLoading,
    refreshEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    googleStatus,
    urgentCount
  };
};
