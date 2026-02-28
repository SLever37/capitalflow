// features/calendar/services/calendar.service.ts

import { supabase } from '../../../lib/supabase';
import { CalendarEvent } from '../types';

export const calendarService = {
  /* =====================================================
     EVENTOS DO SISTEMA (PARCELAS DOS CONTRATOS)
  ===================================================== */
  async fetchSystemEvents(
    profileId: string
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    const { data: loans, error } =
      await supabase
        .from('contratos')
        .select(`
          id,
          debtor_name,
          debtor_phone,
          client_id,
          status,
          parcelas (
            id,
            data_vencimento,
            status,
            amount,
            principal_remaining,
            interest_remaining,
            late_fee_accrued,
            numero_parcela
          )
        `)
        .eq('profile_id', profileId)
        .not(
          'status',
          'in',
          '("ENCERRADO","PAID")'
        )
        .eq('is_archived', false);

    if (error) {
      console.error(
        'Calendar system events error:',
        error
      );
      throw error;
    }

    if (!loans) return events;

    loans.forEach((loan: any) => {
      loan.parcelas?.forEach(
        (p: any) => {
          if (
            String(
              p.status
            ).toUpperCase() ===
            'PAID'
          )
            return;

          const dueDate =
            p.data_vencimento;

          const today = new Date();
          today.setHours(
            0,
            0,
            0,
            0
          );

          const due = new Date(
            dueDate
          );
          due.setHours(
            0,
            0,
            0,
            0
          );

          const isLate =
            due.getTime() <
            today.getTime();
          const isToday =
            due.getTime() ===
            today.getTime();
          const isSoon =
            !isLate &&
            !isToday &&
            due.getTime() -
              today.getTime() <=
              7 *
                24 *
                60 *
                60 *
                1000;

          let label:
            | 'OVERDUE'
            | 'DUE_TODAY'
            | 'DUE_SOON'
            | 'UPCOMING' =
            'UPCOMING';

          if (isLate)
            label = 'OVERDUE';
          else if (isToday)
            label = 'DUE_TODAY';
          else if (isSoon)
            label = 'DUE_SOON';

          const installmentTotal =
            (Number(
              p.principal_remaining
            ) || 0) +
            (Number(
              p.interest_remaining
            ) || 0) +
            (Number(
              p.late_fee_accrued
            ) || 0);

          events.push({
            id: `inst-${p.id}`,
            title:
              loan.debtor_name ||
              'Cliente',
            description: `Parcela ${
              p.numero_parcela ||
              'Única'
            } • R$ ${Number(
              p.amount || 0
            ).toFixed(2)}`,
            start_time: dueDate,
            end_time: dueDate,
            is_all_day: true,
            type: 'SYSTEM_INSTALLMENT',
            status: label,
            priority: isLate
              ? 'HIGH'
              : isToday
              ? 'MEDIUM'
              : 'LOW',
            meta: {
              loanId: loan.id,
              installmentId:
                p.id,
              clientId:
                loan.client_id,
              amount:
                installmentTotal,
              clientName:
                loan.debtor_name,
              clientPhone:
                loan.debtor_phone,
              label
            },
            color: isLate
              ? '#f43f5e'
              : isToday
              ? '#f59e0b'
              : '#3b82f6'
          });
        }
      );
    });

    return events;
  },

  /* =====================================================
     EVENTOS CRIADOS PELO USUÁRIO
  ===================================================== */
  async listUserEvents(
    profileId: string
  ): Promise<CalendarEvent[]> {
    const { data, error } =
      await supabase
        .from('calendar_events')
        .select('*')
        .eq('profile_id', profileId);

    if (error) {
      console.error(
        'Calendar user events error:',
        error
      );
      throw error;
    }

    return data || [];
  },

  /* =====================================================
     CRIAR EVENTO
  ===================================================== */
  async createEvent(
    event: Partial<CalendarEvent>,
    profileId: string
  ) {
    const { data, error } =
      await supabase
        .from('calendar_events')
        .insert([
          {
            ...event,
            profile_id: profileId
          }
        ])
        .select()
        .single();

    if (error) {
      console.error(
        'Calendar create error:',
        error
      );
      throw error;
    }

    return data;
  },

  /* =====================================================
     ATUALIZAR EVENTO
  ===================================================== */
  async updateEvent(
    id: string,
    updates: Partial<CalendarEvent>
  ) {
    const { error } =
      await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id);

    if (error) {
      console.error(
        'Calendar update error:',
        error
      );
      throw error;
    }
  },

  /* =====================================================
     EXCLUIR EVENTO
  ===================================================== */
  async deleteEvent(id: string) {
    const { error } =
      await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

    if (error) {
      console.error(
        'Calendar delete error:',
        error
      );
      throw error;
    }
  }
};