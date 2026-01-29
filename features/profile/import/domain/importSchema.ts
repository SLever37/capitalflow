
export interface ImportCandidate {
    nome: string;
    documento: string;
    whatsapp: string;
    email?: string;
    endereco?: string;
    cidade?: string;
    uf?: string;
    notas?: string;
    
    // Metadados de Curadoria
    status: 'OK' | 'AVISO' | 'ERRO';
    mensagens: string[];
    original_row: any;
}

export const FIELD_MAPS = [
    { key: 'nome', labels: ['nome', 'cliente', 'devedor', 'nome completo', 'razao social'] },
    { key: 'documento', labels: ['cpf', 'cnpj', 'documento', 'identidade', 'cpf/cnpj'] },
    { key: 'whatsapp', labels: ['whatsapp', 'telefone', 'celular', 'contato', 'fone'] },
    { key: 'email', labels: ['email', 'e-mail', 'correio'] },
    { key: 'endereco', labels: ['endereco', 'logradouro', 'rua', 'residência'] },
    { key: 'cidade', labels: ['cidade', 'municipio', 'localidade'] },
    { key: 'uf', labels: ['uf', 'estado', 'sigla'] },
    { key: 'notas', labels: ['notas', 'observacoes', 'info', 'detalhes'] }
];
