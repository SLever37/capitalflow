
export interface ImportCandidate {
    name: string;
    phone: string;
    document?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    notes?: string;
    
    // Financial fields (opcionais para carga inicial)
    principal?: number;
    interestRate?: number;
    startDate?: string;
    
    status: 'VALID' | 'INVALID';
    error?: string;
}

export const REQUIRED_COLUMNS = ['nome', 'name', 'cliente'];
