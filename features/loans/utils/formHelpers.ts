
import { CapitalSource } from '../../../types';

export const safeIsoDateOnly = (val: string | undefined): string => {
    if (!val) return new Date().toISOString().split('T')[0];
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
