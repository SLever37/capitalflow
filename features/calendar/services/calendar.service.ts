
import { supabase } from '../../../lib/supabase';
import { CalendarEvent } from '../types';

export const calendarService = {
  async fetchSystemEvents(profileId: string): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // A) Buscar Contratos e Parcelas (Incluindo telefone e nome)
    const { data: loans } = await supabase
      .from('contratos')
      .select('id, debtor_name, debtor_phone, client_id, start_date, parcelas(id, data_vencimento, status, amount, principal_remaining, interest_remaining, late_fee_accrued, numero_parcela)')
      .eq('profile_id', profileId)
      .eq('is_archived', false);

    if (loans) {
      loans.forEach((loan: any) => {
        // A.2) Parcelas (Ação de Cobrança/Pagamento)
        loan.parcelas?.forEach((p: any) => {
          if (p.status !== 'PAID') {
              const dueDate = p.data_vencimento;
              const isLate = new Date(dueDate).getTime() < new Date().setHours(0,0,0,0);
              const totalDue = (p.principal_remaining || 0) + (p.interest_remaining || 0) + (p.late_fee_accrued || 0);

              events.push({
                  id: `inst-${p.id}`,
                  title: `${loan.debtor_name}`,
                  description: `Parcela ${p.numero_parcela || 'Única'} • R$ ${p.amount.toFixed(2)}`,
                  start_time: dueDate,
                  end_time: dueDate,
                  is_all_day: true,
                  type: 'SYSTEM_INSTALLMENT',
                  status: isLate ? 'LATE' : 'PENDING',
                  priority: isLate ? 'HIGH' : 'MEDIUM',
                  meta: { 
                      loanId: loan.id, 
                      installmentId: p.id, 
                      clientId: loan.client_id, 
                      amount: totalDue,
                      clientName: loan.debtor_name,
                      clientPhone: loan.debtor_phone
                  },
                  color: isLate ? '#f43f5e' : '#f59e0b' 
              });
          }
        });
      });
    }

    // B) Buscar Solicitações do Portal (URGENTE)
    const { data: signals } = await supabase
        .from('sinalizacoes_pagamento')
        .select(`
            *,
            contratos (debtor_name, debtor_phone)
        `)
        .eq('profile_id', profileId)
        .eq('status', 'PENDENTE');

    if (signals) {
        signals.forEach((s: any) => {
            const clientName = s.contratos?.debtor_name || 'Cliente';
            events.push({
                id: `signal-${s.id}`,
                title: `SINALIZAÇÃO: ${clientName}`,
                description: s.tipo_intencao === 'PAGAR_PIX' ? 'Enviou comprovante PIX' : 'Solicitou link de pagamento',
                start_time: s.created_at,
                end_time: s.created_at,
                is_all_day: false,
                type: 'SYSTEM_PORTAL_REQUEST',
                status: 'PENDING',
                priority: 'URGENT',
                meta: { 
                    loanId: s.loan_id, 
                    clientId: s.client_id, 
                    signalId: s.id, 
                    comprovanteUrl: s.comprovante_url,
                    clientName: clientName,
                    clientPhone: s.contratos?.debtor_phone
                },
                color: '#10b981'
            });
        });
    }

    return events;
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
