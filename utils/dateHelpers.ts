
// utils/dateHelpers.ts
const MS_PER_DAY = 86400000;
export type DateInput = string | Date | null | undefined;

export const todayDateOnlyUTC = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

export const parseDateOnlyUTC = (input: DateInput): Date => {
  if (!input) return todayDateOnlyUTC();

  // Se já for Date válido
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return todayDateOnlyUTC();
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }

  try {
    const raw = String(input).trim();
    if (!raw) return todayDateOnlyUTC();

    // ISO YYYY-MM-DD
    const iso10 = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso10)) {
      const [y, m, d] = iso10.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }

    // BR DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [dd, mm, yyyy] = raw.split('/').map(Number);
      return new Date(Date.UTC(yyyy, mm - 1, dd));
    }

    // Tenta construtor padrão
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return todayDateOnlyUTC(); // Fallback seguro
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  } catch (e) {
    return todayDateOnlyUTC();
  }
};

export const isWeekendUTC = (date: Date): boolean => {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
};

export const addDaysUTC = (date: DateInput, days: number, skipWeekends: boolean = false): Date => {
  let d = parseDateOnlyUTC(date);
  
  if (!skipWeekends) {
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }

  // LÓGICA REFINADA PARA DIAS ÚTEIS
  if (days > 0) {
      let added = 0;
      while (added < days) {
        d.setUTCDate(d.getUTCDate() + 1);
        if (!isWeekendUTC(d)) {
          added++;
        }
      }
  }
  
  // Apenas move para o próximo dia útil se a data final cair num fim de semana
  if (days > 0) {
    while (isWeekendUTC(d)) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }
  
  return d;
};

export const toISODateOnlyUTC = (date: DateInput): string => {
  const d = parseDateOnlyUTC(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatBRDate = (date: DateInput): string => {
  const d = parseDateOnlyUTC(date);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// Hoje - target (positivo = atrasado; negativo = faltam dias)
export const getDaysDiff = (targetDate: DateInput): number => {
  const target = parseDateOnlyUTC(targetDate).getTime();
  const today = todayDateOnlyUTC().getTime();
  return Math.round((today - target) / MS_PER_DAY);
};

export const getDaysUntilDue = (dueDate: DateInput): number => {
  const diff = getDaysDiff(dueDate);
  return diff < 0 ? Math.abs(diff) : 0;
};

export const getDueStatus = (dueDate: DateInput) => {
  const diff = getDaysDiff(dueDate);
  return {
    daysLeft: diff < 0 ? Math.abs(diff) : 0,
    daysLate: diff > 0 ? diff : 0,
    isToday: diff === 0
  };
};
