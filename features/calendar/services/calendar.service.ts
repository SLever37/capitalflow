
import { supabase } from '../../../lib/supabase';
import { CalendarEvent } from '../types';

export const calendarService = {
  async fetchSystemEvents(profileId: string): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // 1) Buscar Contratos Ativos e suas Parcelas (Fonte de Verdade)
    // Filtro: Somente contratos que não estão ENCERRADO ou PAID
    const { data: loans } = await supabase
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
      .not('status', 'in', '("ENCERRADO","PAID")')
      .eq('is_archived', false);

    if (loans) {
      loans.forEach((loan: any) => {
        loan.parcelas?.forEach((p: any) => {
          // Somente parcelas não pagas
          if (p.status !== 'PAID') {
            const dueDate = p.data_vencimento;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(dueDate);
            due.setHours(0, 0, 0, 0);
            
            const isLate = due.getTime() < today.getTime();
            const isToday = due.getTime() === today.getTime();
            const isSoon = !isLate && !isToday && (due.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000);
            
            let label: 'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON' | 'UPCOMING' = 'UPCOMING';
            if (isLate) label = 'OVERDUE';
            else if (isToday) label = 'DUE_TODAY';
            else if (isSoon) label = 'DUE_SOON';

            const installmentTotal = (Number(p.principal_remaining) || 0) + (Number(p.interest_remaining) || 0) + (Number(p.late_fee_accrued) || 0);

            events.push({
              id: `inst-${p.id}`,
              title: loan.debtor_name,
              description: `Parcela ${p.numero_parcela || 'Única'} • R$ ${Number(p.amount).toFixed(2)}`,
              start_time: dueDate,
              end_time: dueDate,
              is_all_day: true,
              type: 'SYSTEM_INSTALLMENT',
              status: label,
              priority: isLate ? 'HIGH' : (isToday ? 'MEDIUM' : 'LOW'),
              meta: { 
                loanId: loan.id, 
                installmentId: p.id, 
                clientId: loan.client_id, 
                amount: installmentTotal,
                clientName: loan.debtor_name,
                clientPhone: loan.debtor_phone,
                label
              },
              color: isLate ? '#f43f5e' : (isToday ? '#f59e0b' : '#3b82f6')
            });
          }
        });
      });
    }


    return events;

    // TODO: Implementar uma função separada para buscar e exibir payment_intents como sinalização visual, se necessário.

  },

  async listUserEvents(profileId: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase.from('calendar_events').select('*').eq('profile_id', profileId);
    if (error) throw error;
    return data || [];
  },

  async createEvent(event: Partial<CalendarEvent>, profileId: string) {
    const { data, error } = await supabase.from('calendar_events').insert([{ ...event, profile_id: profileId }]).select().single();
    if (error) throw error;
    return data;
  },

  async updateEvent(id: string, updates: Partial<CalendarEvent>) {
    const { error } = await supabase.from('calendar_events').update(updates).eq('id', id);
    if (error) throw error;
  },

  async deleteEvent(id: string) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) throw error;
  }
};
