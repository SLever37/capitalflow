
import { supabase } from "../../../lib/supabase";
import { Agreement, AgreementInstallment, UserProfile } from "../../../types";
import { generateUUID } from "../../../utils/generators";

export const agreementService = {
    async createAgreement(
        loanId: string,
        agreementData: Omit<Agreement, 'id' | 'createdAt' | 'status' | 'installments'>,
        installments: AgreementInstallment[],
        profileId: string
    ) {
        const agreementId = generateUUID();
        const now = new Date().toISOString();

        // 1. Criar Header do Acordo
        const { error: headerError } = await supabase.from('acordos_inadimplencia').insert({
            id: agreementId,
            loan_id: loanId,
            profile_id: profileId,
            tipo_acordo: agreementData.type,
            total_divida_base: agreementData.totalDebtAtNegotiation,
            total_negociado: agreementData.negotiatedTotal,
            juros_aplicado: agreementData.interestRate || 0,
            qtd_parcelas: agreementData.installmentsCount,
            periodicidade: agreementData.frequency,
            status: 'ACTIVE',
            created_at: now
        });

        if (headerError) throw new Error("Erro ao criar acordo: " + headerError.message);

        // 2. Criar Parcelas
        const installmentsPayload = installments.map(inst => ({
            id: generateUUID(),
            acordo_id: agreementId,
            profile_id: profileId,
            numero: inst.number,
            data_vencimento: inst.dueDate,
            valor: inst.amount,
            status: 'PENDING',
            valor_pago: 0
        }));

        const { error: instError } = await supabase.from('acordo_parcelas').insert(installmentsPayload);
        if (instError) throw new Error("Erro ao gerar parcelas do acordo: " + instError.message);

        return agreementId;
    },

    async processPayment(
        agreement: Agreement,
        installment: AgreementInstallment,
        amount: number,
        sourceId: string,
        user: UserProfile
    ) {
        // 1. Atualizar parcela
        const newPaidAmount = installment.paidAmount + amount;
        let newStatus = installment.status;
        
        // Tolerância de R$ 0.10
        if (newPaidAmount >= (installment.amount - 0.10)) {
            newStatus = 'PAID';
        } else {
            newStatus = 'PARTIAL';
        }

        const { error: instError } = await supabase.from('acordo_parcelas')
            .update({ 
                valor_pago: newPaidAmount, 
                status: newStatus, 
                data_pagamento: new Date().toISOString() 
            })
            .eq('id', installment.id);

        if (instError) throw instError;

        // 2. Registrar pagamento
        await supabase.from('acordo_pagamentos').insert({
            id: generateUUID(),
            parcela_id: installment.id,
            acordo_id: agreement.id,
            profile_id: user.id,
            amount: amount,
            date: new Date().toISOString()
        });

        // 3. Atualizar Caixa (Ledger Geral)
        // Usamos uma transação especial para vincular ao acordo
        await supabase.from('transacoes').insert({
            id: generateUUID(),
            loan_id: agreement.loanId,
            agreement_id: agreement.id, // Vínculo novo
            profile_id: user.id,
            source_id: sourceId,
            date: new Date().toISOString(),
            type: 'AGREEMENT_PAYMENT', // Novo tipo
            amount: amount,
            principal_delta: 0, // Contabilidade separada
            interest_delta: 0,
            late_fee_delta: 0,
            category: 'RECUPERACAO',
            notes: `Pagamento Acordo ${installment.number}/${agreement.installmentsCount}`
        });

        // 4. Atualizar saldo da fonte
        await supabase.rpc('adjust_source_balance', { p_source_id: sourceId, p_delta: amount });

        // 5. Verificar Quitação Total do Acordo
        if (newStatus === 'PAID') {
            // Verifica se existem outras parcelas pendentes
            const { count } = await supabase.from('acordo_parcelas')
                .select('*', { count: 'exact', head: true })
                .eq('acordo_id', agreement.id)
                .neq('status', 'PAID');
            
            if (count === 0) {
                // QUITAÇÃO DO ACORDO = QUITAÇÃO DO EMPRÉSTIMO
                await supabase.from('acordos_inadimplencia').update({ status: 'PAID' }).eq('id', agreement.id);
                
                // Baixa nas parcelas originais do contrato para constar como pago
                // Isso é opcional, mas ajuda na consistência. Ou apenas marcamos o contrato como arquivado/pago.
                // Vamos marcar todas as parcelas originais como PAID via update
                await supabase.from('parcelas')
                    .update({ status: 'PAID', paid_total: 0 }) // paid_total 0 pois o valor entrou via acordo
                    .eq('loan_id', agreement.loanId)
                    .neq('status', 'PAID');
            }
        }
    },

    async breakAgreement(agreementId: string) {
        await supabase.from('acordos_inadimplencia').update({ status: 'BROKEN' }).eq('id', agreementId);
    }
};
