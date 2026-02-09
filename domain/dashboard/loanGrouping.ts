
import { Loan, LoanStatus, SortOption } from '../../types';
import { getInstallmentStatusLogic } from '../../domain/finance/calculations';
import { getDaysDiff } from '../../utils/dateHelpers';

export interface ClientGroup {
  clientId: string;
  clientName: string;
  avatarUrl?: string;
  loans: Loan[];
  totalDebt: number;
  totalMonthlyDue: number;
  status: 'CRITICAL' | 'LATE' | 'WARNING' | 'OK' | 'PAID';
  contractCount: number;
  // Metadados internos para ordenação
  _sortMeta?: {
      minDueDate: number;
      maxCreatedAt: number;
      maxUpdatedAt: number;
  };
}

export const groupLoansByClient = (loans: Loan[], sortOption: SortOption = 'DUE_DATE_ASC'): ClientGroup[] => {
  const groups: Record<string, ClientGroup> = {};
  
  loans.forEach(loan => {
    const cleanName = (loan.debtorName || 'Cliente Desconhecido').trim();
    
    // REGRA DE AGRUPAMENTO: NOME + CÓDIGO DO CLIENTE
    // Nunca agrupar por CPF.
    // O código do cliente (debtorClientNumber) é injetado pelo loanAdapter se o cliente existir.
    // Se não tiver código, usa o ID interno do cliente. Se não tiver ID, usa 'S/C' (Sem Código).
    
    const clientCode = (loan as any).debtorClientNumber || loan.clientId || 'SC';
    
    // Chave composta única: Nome|Código
    // Isso garante que "João|100" e "João|101" sejam grupos diferentes.
    // E "João|100" (Contrato A) e "João|100" (Contrato B) sejam o mesmo grupo.
    const key = `${cleanName}|${clientCode}`;

    if (!groups[key]) {
      groups[key] = {
        clientId: loan.clientId || key, // Mantém ID para chaves do React, fallback para a key composta
        clientName: cleanName,
        avatarUrl: loan.clientAvatarUrl,
        loans: [],
        totalDebt: 0,
        totalMonthlyDue: 0,
        status: 'OK',
        contractCount: 0
      };
    }

    if (!groups[key].avatarUrl && loan.clientAvatarUrl) {
        groups[key].avatarUrl = loan.clientAvatarUrl;
    }

    groups[key].loans.push(loan);
    groups[key].contractCount++;

    const loanDebt = loan.installments.reduce((acc, i) => acc + (Number(i.principalRemaining) || 0) + (Number(i.interestRemaining) || 0), 0);
    groups[key].totalDebt += loanDebt;
  });

  // Processamento Final de Status e Preparação para Ordenação
  return Object.values(groups).map(group => {
    let worstStatusPriority = 0; // 0=Paid, 1=OK, 2=Warning, 3=Late, 4=Critical
    
    // Variáveis para auxiliar a ordenação do GRUPO
    let minDueDate = 9999999999999;
    let maxCreatedAt = 0;
    let maxUpdatedAt = 0;

    group.loans.forEach(loan => {
      // 1. Status do Grupo
      const hasCritical = loan.installments.some(i => getDaysDiff(i.dueDate) > 30 && i.status !== LoanStatus.PAID);
      const hasLate = loan.installments.some(i => getInstallmentStatusLogic(i) === LoanStatus.LATE);
      const isPaid = loan.installments.every(i => i.status === LoanStatus.PAID);

      if (hasCritical) worstStatusPriority = Math.max(worstStatusPriority, 4);
      else if (hasLate) worstStatusPriority = Math.max(worstStatusPriority, 3);
      else if (!isPaid) worstStatusPriority = Math.max(worstStatusPriority, 1);
      else worstStatusPriority = Math.max(worstStatusPriority, 0);

      // 2. Metadados de Ordenação
      // Data de Vencimento Mais Próxima (ou atrasada)
      const nextInst = loan.installments.find(i => i.status !== 'PAID');
      if (nextInst) {
          const t = new Date(nextInst.dueDate).getTime();
          if (t < minDueDate) minDueDate = t;
      }
      
      // Data de Criação mais recente
      const createdT = new Date(loan.startDate).getTime();
      if (createdT > maxCreatedAt) maxCreatedAt = createdT;

      // Data de Atualização mais recente (Ledger ou Criação)
      const lastLedger = loan.ledger && loan.ledger.length > 0 ? loan.ledger[loan.ledger.length - 1] : null;
      const updatedT = lastLedger ? new Date(lastLedger.date).getTime() : createdT;
      if (updatedT > maxUpdatedAt) maxUpdatedAt = updatedT;
    });

    if (worstStatusPriority === 4) group.status = 'CRITICAL';
    else if (worstStatusPriority === 3) group.status = 'LATE';
    else if (worstStatusPriority === 2) group.status = 'WARNING';
    else if (worstStatusPriority === 1) group.status = 'OK';
    else group.status = 'PAID';

    // Ordena contratos DENTRO do grupo (sempre cronológico)
    group.loans.sort((a, b) => {
        const nextA = a.installments.find(i => i.status !== 'PAID')?.dueDate || '9999-12-31';
        const nextB = b.installments.find(i => i.status !== 'PAID')?.dueDate || '9999-12-31';
        return new Date(nextA).getTime() - new Date(nextB).getTime();
    });

    // Anexa metadados para o sort final
    group._sortMeta = { minDueDate, maxCreatedAt, maxUpdatedAt };

    return group;

  }).sort((a, b) => {
     // ORDENAÇÃO DOS GRUPOS (CARDS)
     
     if (sortOption === 'NAME_ASC') {
         return a.clientName.localeCompare(b.clientName);
     }
     
     if (sortOption === 'CREATED_DESC') {
         return (b._sortMeta?.maxCreatedAt || 0) - (a._sortMeta?.maxCreatedAt || 0);
     }

     if (sortOption === 'UPDATED_DESC') {
         return (b._sortMeta?.maxUpdatedAt || 0) - (a._sortMeta?.maxUpdatedAt || 0);
     }

     // Padrão (DUE_DATE_ASC): Mantém a lógica de prioridade de risco (Críticos/Atrasados primeiro)
     // Pois "Vencimento Próximo" implicitamente significa "O que eu tenho que cobrar agora?" (incluindo passados)
     
     const priority = { 'CRITICAL': 4, 'LATE': 3, 'WARNING': 2, 'OK': 1, 'PAID': 0 };
     if (priority[b.status] !== priority[a.status]) {
         return priority[b.status] - priority[a.status];
     }
     
     // Desempate por data de vencimento real dentro do mesmo status
     if (a._sortMeta?.minDueDate !== b._sortMeta?.minDueDate) {
         return (a._sortMeta?.minDueDate || 0) - (b._sortMeta?.minDueDate || 0);
     }

     return b.totalDebt - a.totalDebt;
  });
};
