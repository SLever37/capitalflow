
export interface ImportCandidate {
    nome: string;
    cpf: string;
    matricula?: string;
    escola: string;
    setor: string;
    funcao: string;
    data_admissao?: string;
    salario?: number;
    carga_horaria?: string;
    
    // Metadados de Curadoria
    status: 'OK' | 'AVISO' | 'ERRO';
    mensagens: string[];
    original_row: any;
}

export const FIELD_MAPS = [
    { key: 'nome', labels: ['nome', 'funcionario', 'servidor', 'trabalhador', 'nome completo'] },
    { key: 'cpf', labels: ['cpf', 'documento', 'identidade', 'cpf/cnpj'] },
    { key: 'matricula', labels: ['matricula', 'matrícula', 'registro', 'id', 'cod'] },
    { key: 'escola', labels: ['escola', 'unidade', 'lotacao', 'lotação', 'local', 'instituição'] },
    { key: 'setor', labels: ['setor', 'secretaria', 'departamento', 'divisão', 'pasta'] },
    { key: 'funcao', labels: ['função', 'funcao', 'cargo', 'atribuição', 'atividade'] },
    { key: 'data_admissao', labels: ['admissão', 'entrada', 'data', 'inicio', 'posse', 'admissao'] },
    { key: 'salario', labels: ['salário', 'vencimento', 'remuneração', 'valor', 'base', 'salario'] },
    { key: 'carga_horaria', labels: ['carga horária', 'horas', 'jornada', 'ch', 'horário'] }
];
