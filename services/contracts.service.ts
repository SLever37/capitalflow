
import { supabase } from '../lib/supabase';
import { Loan, UserProfile, CapitalSource } from '../types';
import { onlyDigits, isTestClientName } from '../utils/formatters';
import { isValidCPForCNPJ } from '../utils/validators';
import { generateUUID } from '../utils/generators';
import { modalityRegistry } from '../domain/finance/modalities/registry';

export const contractsService = {
  // Added saveNote method to fix "Property 'saveNote' does not exist" error
  async saveNote(loanId: string, note: string) {
    const { error } = await supabase.from('contratos').update({ notes: note }).eq('id', loanId);
    if (error) throw error;
  },

  async saveLoan(loan: Loan, activeUser: UserProfile, sources: CapitalSource[], editingLoan: Loan | null) {
    if (!activeUser) throw new Error("Usuário não autenticado");

    const ownerId = activeUser.supervisor_id || activeUser.id;
    const isStaff = !!activeUser.supervisor_id;

    let finalSourceId = loan.sourceId;
    let finalClientId = loan.clientId;

    const docClean = onlyDigits(loan.debtorDocument || '');
    if (!finalClientId) {
      const newId = generateUUID();
      await supabase.from('clientes').insert([{
        id: newId,
        profile_id: ownerId, // Pertence ao sistema do Supervisor
        created_by_id: activeUser.id, // Mas foi criado por este usuário
        name: loan.debtorName,
        phone: loan.debtorPhone,
        document: docClean || null
      }]);
      finalClientId = newId;
    }

    const principal = Number(loan.principal) || 0;
    const interestRate = Number(loan.interestRate) || 0;

    const contractData: any = { 
      id: loan.id, 
      profile_id: ownerId, // ID do Dono para RLS global
      operador_responsavel_id: activeUser.id, // ID do Funcionário para filtro de Staff
      client_id: finalClientId, 
      source_id: finalSourceId, 
      debtor_name: loan.debtorName, 
      debtor_phone: loan.debtorPhone, 
      debtor_document: loan.debtorDocument, 
      principal, 
      interest_rate: interestRate, 
      billing_cycle: loan.billingCycle || 'MONTHLY', 
      start_date: loan.startDate,
      is_archived: loan.isArchived || false
    };

    const strategy = modalityRegistry.get(loan.billingCycle);
    const { installments, totalToReceive } = strategy.generateInstallments({ principal, rate: interestRate, startDate: loan.startDate });
    contractData.total_to_receive = totalToReceive;

    const { error: loanError } = await supabase.from('contratos').upsert(contractData);
    if (loanError) throw loanError;

    await supabase.from('transacoes').insert([{ 
        id: generateUUID(), 
        loan_id: loan.id, 
        profile_id: ownerId, 
        operator_id: activeUser.id, // Log de quem fez o empréstimo
        source_id: finalSourceId, 
        date: new Date().toISOString(), 
        type: 'LEND_MORE', 
        amount: principal, 
        category: 'INVESTIMENTO'
    }]);
  }
};
