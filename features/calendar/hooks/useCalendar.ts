// features/calendar/hooks/useCalendar.ts

import { useEffect, useState, useCallback } from 'react';
import { calendarService } from '../services/calendar.service';
import { CalendarEvent } from '../types';
import { UserProfile } from '../../../types';

export const useCalendar = (
  activeUser: UserProfile | null,
  showToast: (msg: string, type?: any) => void
) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadEvents = useCallback(async () => {
    if (!activeUser?.profile_id) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [systemEvents, userEvents] = await Promise.all([
        calendarService.fetchSystemEvents(activeUser.profile_id),
        calendarService.listUserEvents(activeUser.profile_id)
      ]);

      const merged = [...systemEvents, ...userEvents];

      setEvents(merged);
    } catch (error: any) {
      console.error('Calendar load error:', error);
      showToast?.(
        error?.message || 'Erro ao carregar agenda',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeUser, showToast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const addEvent = async (
    event: Partial<CalendarEvent>
  ) => {
    if (!activeUser?.profile_id) return;

    try {
      const created =
        await calendarService.createEvent(
          event,
          activeUser.profile_id
        );

      setEvents((prev) => [
        ...prev,
        created
      ]);

      return created;
    } catch (error: any) {
      console.error(
        'Calendar create error:',
        error
      );
      showToast?.(
        error?.message ||
          'Erro ao criar evento',
        'error'
      );
    }
  };

  const updateEvent = async (
    id: string,
    updates: Partial<CalendarEvent>
  ) => {
    try {
      await calendarService.updateEvent(
        id,
        updates
      );

      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, ...updates }
            : e
        )
      );
    } catch (error: any) {
      console.error(
        'Calendar update error:',
        error
      );
      showToast?.(
        error?.message ||
          'Erro ao atualizar evento',
        'error'
      );
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await calendarService.deleteEvent(id);

      setEvents((prev) =>
        prev.filter((e) => e.id !== id)
      );
    } catch (error: any) {
      console.error(
        'Calendar delete error:',
        error
      );
      showToast?.(
        error?.message ||
          'Erro ao excluir evento',
        'error'
      );
    }
  };

  const refreshEvents = async () => {
    await loadEvents();
  };

  return {
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshEvents
  };
};