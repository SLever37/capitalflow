
import { CapitalSource } from '../../../types';

export const safeIsoDateOnly = (val: string | undefined): string => {
    if (!val) {
        // CORREÇÃO: Usar data local compensada para evitar bugs de UTC (data caindo no dia seguinte)
        const now = new Date();
        const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
        return localDate.toISOString().split('T')[0];
    }
    return val.includes('T') ? val.split('T')[0] : val;
};

export const safeSourceId = (sources: CapitalSource[], requestedId?: string): string => {
    if (requestedId) return requestedId;
    if (sources && sources.length > 0) return sources[0].id;
    return '';
};

export const safeFileFirst = (files: FileList | null): File | null => {
    if (files && files.length > 0) {
        return files[0];
    }
    return null;
};
