export interface ImportCandidate {
    name: string;
    phone: string;
    document?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    notes?: string;
    
    // Campos Financeiros detectados via curadoria
    principal?: number;
    interestRate?: number;
    startDate?: string;
    
    status: 'VALID' | 'INVALID' | 'WARNING';
    error?: string;
}

export const SYNONYMS = {
    name: ['nome', 'cliente', 'devedor', 'servidor', 'funcionario', 'name', 'razao'],
    phone: ['tel', 'cel', 'whats', 'fone', 'phone', 'contato', 'telefone'],
    document: ['cpf', 'cnpj', 'doc', 'identidade', 'documento', 'inscricao'],
    email: ['email', 'e-mail', 'correio'],
    address: ['end', 'rua', 'address', 'local', 'endereco', 'logradouro'],
    principal: ['valor', 'principal', 'emprestimo', 'montante', 'capital', 'divida', 'vencimento'],
    interestRate: ['taxa', 'juro', '%', 'interest', 'rate'],
    startDate: ['data', 'inicio', 'contrato', 'entrada', 'date', 'created', 'emissao']
};