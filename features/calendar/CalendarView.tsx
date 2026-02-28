// features/calendar/CalendarView.tsx

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  Search,
  Calendar as CalIcon,
  AlertTriangle,
  Clock,
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

const getInitials = (name: string) => {
  const n = (name || '').trim();
  if (!n) return '??';
  const parts = n.split(/\s+/).filter(Boolean).slice(0, 2);
  const first = parts[0]?.[0] || '?';
  const second =
    parts.length > 1
      ? parts[1]?.[0] || ''
      : parts[0]?.[1] || '';
  return (first + second).toUpperCase();
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  activeUser,
  showToast,
  onClose,
  onSystemAction
}) => {
  const { events, isLoading, addEvent } =
    useCalendar(activeUser, showToast);

  const [filter, setFilter] =
    useState<FilterType>('HOJE');
  const [searchTerm, setSearchTerm] =
    useState('');
  const [viewMode, setViewMode] =
    useState<ViewMode>('AGENDA');
  const [notifiedIds, setNotifiedIds] =
    useState<Set<string>>(new Set());

  const agendaItems = useMemo(() => {
    return events.map((ev) => ({
      id: ev.id,
      date: new Date(ev.start_time),
      title:
        ev.meta?.clientName ||
        ev.title ||
        'Cliente',
      subtitle:
        ev.description || 'Parcela',
      status: ev.status,
      type: ev.type,
      priority: ev.priority,
      loanId: ev.meta?.loanId,
      installmentId:
        ev.meta?.installmentId,
      clientName:
        ev.meta?.clientName ||
        ev.title,
      clientPhone:
        ev.meta?.clientPhone,
      amount:
        Number(ev.meta?.amount) || 0,
      meta: ev.meta
    }));
  }, [events]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lateItems =
      agendaItems.filter((item) => {
        const d = new Date(item.date);
        d.setHours(0, 0, 0, 0);
        return (
          (item.status ===
            'OVERDUE' ||
            d < today) &&
          !notifiedIds.has(item.id)
        );
      });

    if (lateItems.length > 0) {
      const newSet =
        new Set(notifiedIds);

      lateItems.forEach((item) => {
        newSet.add(item.id);

        notificationService.notify(
          `Parcela Vencida: ${item.clientName}`,
          `${item.subtitle} - ${formatMoney(
            item.amount
          )}`,
          () =>
            onSystemAction(
              'PAYMENT',
              item.meta
            )
        );
      });

      setNotifiedIds(newSet);
    }
  }, [
    agendaItems,
    notifiedIds,
    onSystemAction
  ]);

  const raioX = useMemo(() => {
    const installments =
      agendaItems.filter(
        (i) =>
          i.type ===
          'SYSTEM_INSTALLMENT'
      );

    const late =
      installments.filter(
        (i) =>
          i.status ===
          'OVERDUE'
      );
    const dueToday =
      installments.filter(
        (i) =>
          i.status ===
          'DUE_TODAY'
      );
    const dueSoon =
      installments.filter(
        (i) =>
          i.status ===
          'DUE_SOON'
      );
    const upcoming =
      installments.filter(
        (i) =>
          i.status ===
          'UPCOMING'
      );

    return {
      late,
      dueToday,
      dueSoon,
      upcoming,
      totalLate: late.reduce(
        (s, i) => s + i.amount,
        0
      ),
      totalToday:
        dueToday.reduce(
          (s, i) => s + i.amount,
          0
        ),
      totalSoon:
        dueSoon.reduce(
          (s, i) => s + i.amount,
          0
        ),
      totalUpcoming:
        upcoming.reduce(
          (s, i) => s + i.amount,
          0
        ),
      totalCount:
        installments.length
    };
  }, [agendaItems]);

  const filteredItems =
    useMemo(() => {
      const now = new Date();
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const next7 = new Date(today);
      next7.setDate(
        today.getDate() + 7
      );

      const endOfMonth =
        new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );

      return agendaItems.filter(
        (item) => {
          const itemDay =
            new Date(
              item.date.getFullYear(),
              item.date.getMonth(),
              item.date.getDate()
            );

          const matchesSearch =
            !searchTerm ||
            item.title
              .toLowerCase()
              .includes(
                searchTerm.toLowerCase()
              ) ||
            item.subtitle
              .toLowerCase()
              .includes(
                searchTerm.toLowerCase()
              );

          if (!matchesSearch)
            return false;

          switch (filter) {
            case 'HOJE':
              return (
                itemDay.getTime() ===
                  today.getTime() ||
                item.status ===
                  'OVERDUE'
              );
            case 'SEMANA':
              return (
                (itemDay >= today &&
                  itemDay <= next7) ||
                item.status ===
                  'OVERDUE'
              );
            case 'MES':
              return (
                (itemDay >= today &&
                  itemDay <=
                    endOfMonth) ||
                item.status ===
                  'OVERDUE'
              );
            default:
              return true;
          }
        }
      );
    }, [
      agendaItems,
      filter,
      searchTerm
    ]);

  const groupedItems =
    useMemo(() => {
      const groups: Record<
        string,
        typeof filteredItems
      > = {};

      filteredItems.forEach(
        (item) => {
          const day = new Date(
            item.date.getFullYear(),
            item.date.getMonth(),
            item.date.getDate()
          );
          const key =
            day.toISOString();

          if (!groups[key])
            groups[key] = [];

          groups[key].push(item);
        }
      );

      const sortedKeys =
        Object.keys(groups).sort(
          (a, b) =>
            new Date(a).getTime() -
            new Date(b).getTime()
        );

      return sortedKeys.map(
        (key) => ({
          date: new Date(key),
          items: groups[key].sort(
            (a, b) => {
              if (
                a.status ===
                  'OVERDUE' &&
                b.status !==
                  'OVERDUE'
              )
                return -1;
              if (
                a.status !==
                  'OVERDUE' &&
                b.status ===
                  'OVERDUE'
              )
                return 1;
              return (
                a.date.getTime() -
                b.date.getTime()
              );
            }
          )
        })
      );
    }, [filteredItems]);

  const getDayLabel = (
    date: Date
  ) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow =
      new Date(today);
    tomorrow.setDate(
      today.getDate() + 1
    );

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    if (
      d.getTime() ===
      today.getTime()
    )
      return 'Hoje';
    if (
      d.getTime() ===
      tomorrow.getTime()
    )
      return 'Amanhã';

    return d.toLocaleDateString(
      'pt-BR',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'short'
      }
    );
  };

  const handleCreateReminder =
    async (
      item: (typeof agendaItems)[0]
    ) => {
      const reminderDate =
        new Date(item.date);
      reminderDate.setDate(
        reminderDate.getDate() - 1
      );

      await addEvent({
        title: `LEMBRETE: ${item.clientName}`,
        description: `Cobrar ${item.subtitle} - ${formatMoney(
          item.amount
        )}`,
        start_time:
          reminderDate.toISOString(),
        end_time:
          reminderDate.toISOString(),
        is_all_day: true,
        type: 'REMINDER',
        status: 'PENDING',
        priority: 'HIGH',
        meta: { ...item.meta }
      });

      showToast(
        'Lembrete criado',
        'success'
      );
    };

  const handleWhatsApp = (
    item: (typeof agendaItems)[0]
  ) => {
    const phone =
      item.clientPhone?.replace(
        /\D/g,
        ''
      );

    if (!phone) {
      showToast(
        'Telefone não disponível',
        'error'
      );
      return;
    }

    const text = `Olá ${
      item.clientName
    }, sua parcela de ${formatMoney(
      item.amount
    )} vence em ${item.date.toLocaleDateString(
      'pt-BR'
    )}.`;

    window.open(
      `https://wa.me/55${phone}?text=${encodeURIComponent(
        text
      )}`,
      '_blank'
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-white">
        Carregando...
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col font-sans h-[100dvh]">
      <div className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-white"
          >
            <ChevronLeft size={24} />
          </button>

          <h1 className="text-sm font-black text-white uppercase">
            Agenda
          </h1>
        </div>

        <button
          onClick={() =>
            setViewMode(
              viewMode === 'AGENDA'
                ? 'RAIO_X'
                : 'AGENDA'
            )
          }
          className="text-xs text-purple-400 font-bold"
        >
          {viewMode ===
          'RAIO_X'
            ? 'Agenda'
            : 'Raio-X'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {viewMode ===
        'RAIO_X' ? (
          <div className="space-y-4 text-white text-xs">
            <div>
              Vencidos:{' '}
              {formatMoney(
                raioX.totalLate
              )}
            </div>
            <div>
              Hoje:{' '}
              {formatMoney(
                raioX.totalToday
              )}
            </div>
            <div>
              Próx. 7 dias:{' '}
              {formatMoney(
                raioX.totalSoon
              )}
            </div>
            <div>
              Total ativo:{' '}
              {formatMoney(
                raioX.totalUpcoming +
                  raioX.totalSoon +
                  raioX.totalToday +
                  raioX.totalLate
              )}
            </div>
          </div>
        ) : (
          groupedItems.map(
            (group) => (
              <div
                key={group.date.toISOString()}
              >
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-3">
                  {getDayLabel(
                    group.date
                  )}
                </div>

                {group.items.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white text-xs font-black">
                            {getInitials(
                              item.title
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black text-white uppercase">
                              {item.title}
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-white">
                            {formatMoney(
                              item.amount
                            )}
                          </div>
                          <div className="text-[8px] text-slate-500 uppercase">
                            {item.status}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleWhatsApp(
                              item
                            )
                          }
                          className="px-3 py-1 bg-emerald-600 text-white text-[10px] rounded-lg"
                        >
                          WhatsApp
                        </button>

                        <button
                          onClick={() =>
                            handleCreateReminder(
                              item
                            )
                          }
                          className="px-3 py-1 bg-blue-600 text-white text-[10px] rounded-lg"
                        >
                          Lembrete
                        </button>

                        <button
                          onClick={() =>
                            onSystemAction(
                              'PAYMENT',
                              item.meta
                            )
                          }
                          className="px-3 py-1 bg-slate-700 text-white text-[10px] rounded-lg"
                        >
                          Baixar
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
};