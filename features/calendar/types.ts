
export type CalendarViewMode = 'DAY' | 'WEEK' | 'MONTH' | 'LIST';

export type EventType = 'TASK' | 'MEETING' | 'REMINDER' | 'SYSTEM_LOAN_START' | 'SYSTEM_INSTALLMENT' | 'SYSTEM_PORTAL_REQUEST';
export type EventPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type EventStatus = 'PENDING' | 'DONE' | 'LATE' | 'PAID';

export interface CalendarEvent {
  id: string;
  profile_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  type: EventType;
  status: EventStatus;
  priority: EventPriority;
  recurrence?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  
  // Metadados para Ação do Sistema
  meta?: {
      loanId?: string;
      installmentId?: string;
      clientId?: string;
      amount?: number;
      signalId?: string; // Para solicitações do portal
      comprovanteUrl?: string;
      clientName?: string;     // Novo
      clientPhone?: string;    // Novo
  };
  
  google_event_id?: string;
  
  // Virtual props for UI
  color?: string;
  clientName?: string;
}

export interface GoogleIntegration {
  profile_id: string;
  google_access_token?: string;
  sync_enabled: boolean;
  last_sync_at?: string;
}
