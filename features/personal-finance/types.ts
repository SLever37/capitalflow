export type PFTransactionType = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
export type PFAccountType = 'CORRENTE' | 'POUPANCA' | 'CARTEIRA' | 'INVESTIMENTO';

export interface PFAccount {
    id: string;
    nome: string;
    tipo: PFAccountType;
    saldo: number;
}

export interface PFCard {
    id: string;
    nome: string;
    limite: number;
    dia_fechamento: number;
    dia_vencimento: number;
}

export interface PFCategory {
    id: string;
    nome: string;
    tipo: 'RECEITA' | 'DESPESA';
    icone?: string;
    is_system?: boolean; // Categorias fixas como Salário
}

export interface PFTransaction {
    id: string;
    descricao: string;
    valor: number;
    tipo: PFTransactionType;
    data: string;
    data_pagamento?: string;
    categoria_id?: string;
    conta_id?: string;
    cartao_id?: string;
    fixo: boolean;
    status: 'PENDENTE' | 'CONSOLIDADO';
    category_name?: string; 
    account_name?: string; 
    card_name?: string;
    created_at?: string;
    total_installments?: number;
    installment_number?: number;
    is_operation_transfer?: boolean;
    operation_source_id?: string;
    operation_loan_id?: string;
}

export interface PFDashboardStats {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    expenseByCategory: { name: string; value: number }[];
    monthlyFlow: { month: string; income: number; expense: number }[];
}