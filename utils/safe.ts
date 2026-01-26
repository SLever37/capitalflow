
// Campos críticos que devem gerar aviso em DEV se falharem
const CRITICAL_FIELDS = ['agreement.id', 'status', 'type', 'dueDate', 'id', 'loanId'];

const logWarning = (field: string | undefined, originalValue: any, fallback: any) => {
    // Cast import.meta to any to avoid TS error about env missing on ImportMeta
    const isDev = (import.meta as any).env?.DEV;
    if (isDev && field && CRITICAL_FIELDS.includes(field)) {
        console.warn(
            `%c[SafeGuard] Fallback triggered for critical field: "${field}"`, 
            'background: #fff0f0; color: #ff0000; font-weight: bold',
            { received: originalValue, fallback }
        );
    }
};

/**
 * Garante que o valor seja um array. Se não for, retorna array vazio.
 */
export const asArray = <T>(v: any, fieldName?: string): T[] => {
    if (Array.isArray(v)) return v;
    logWarning(fieldName, v, []);
    return [];
};

/**
 * Garante que o valor seja string. Evita erro de .replace/.toUpperCase em undefined.
 */
export const asString = (v: any, fallback = '', fieldName?: string): string => {
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    logWarning(fieldName, v, fallback);
    return fallback;
};

/**
 * Garante valor numérico seguro.
 */
export const asNumber = (v: any, fallback = 0, fieldName?: string): number => {
    const n = Number(v);
    if (!isNaN(n) && isFinite(n)) return n;
    logWarning(fieldName, v, fallback);
    return fallback;
};

/**
 * Retorna uma string de data ISO segura.
 * Se a entrada for inválida, retorna fallback seguro:
 * - para campos críticos (ex.: dueDate/startDate) retorna '' (evita distorcer regras/ordenação)
 * - para campos não críticos, retorna data atual ISO (evita quebra em UI que espera Date)
 */
export const safeDateString = (v: any, fieldName?: string): string => {
    if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
    if (typeof v === 'string') {
        // Tenta validar se é string de data
        const d = new Date(v);
        if (!isNaN(d.getTime())) return v;
    }
    // Para datas críticas (ex.: vencimento), não use "agora" como fallback, pois isso distorce regras/ordenação.
    const criticalDateField = fieldName === 'dueDate' || fieldName === 'startDate';
    const fallback = criticalDateField ? '' : new Date().toISOString();
    logWarning(fieldName, v, fallback);
    return fallback;
};
