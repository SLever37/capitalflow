
import { addDaysUTC, parseDateOnlyUTC } from "../../../utils/dateHelpers";
import { generateUUID } from "../../../utils/generators";
import { AgreementInstallment, AgreementType } from "../../../types";

interface AgreementSimulationParams {
    totalDebt: number;
    type: AgreementType;
    installmentsCount: number;
    interestRate: number; // Mensal (%)
    firstDueDate: string;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
}

export const simulateAgreement = (params: AgreementSimulationParams): { 
    installments: AgreementInstallment[], 
    negotiatedTotal: number 
} => {
    const { totalDebt, type, installmentsCount, interestRate, firstDueDate, frequency } = params;
    
    let negotiatedTotal = totalDebt;
    let installmentValue = 0;

    // 1. Cálculo do Total Negociado
    if (type === 'PARCELADO_COM_JUROS') {
        // Juros Simples Pro-Rata Mensal aplicado sobre o período total estimado
        // Para simplificar e ser consistente: (Taxa * Meses)
        // Se for semanal, converte meses aproximado (semanas / 4)
        
        let monthsDuration = installmentsCount;
        if (frequency === 'WEEKLY') monthsDuration = installmentsCount / 4;
        if (frequency === 'BIWEEKLY') monthsDuration = installmentsCount / 2;
        
        const totalRate = (interestRate / 100) * monthsDuration;
        negotiatedTotal = totalDebt * (1 + totalRate);
    } else {
        // Sem Juros: Mantém o valor original da dívida
        negotiatedTotal = totalDebt;
    }

    // 2. Valor da Parcela (Divisão simples do total negociado)
    installmentValue = negotiatedTotal / installmentsCount;
    
    // Arredondamento (2 casas)
    installmentValue = Math.round((installmentValue + Number.EPSILON) * 100) / 100;
    
    // Ajuste da última parcela para bater centavos
    const totalInstallmentsSum = installmentValue * installmentsCount;
    const diff = negotiatedTotal - totalInstallmentsSum;

    // 3. Geração das Parcelas
    const installments: AgreementInstallment[] = [];
    let currentDate = parseDateOnlyUTC(firstDueDate);

    for (let i = 1; i <= installmentsCount; i++) {
        let amount = installmentValue;
        if (i === installmentsCount) amount += diff; // Ajuste final

        installments.push({
            id: generateUUID(),
            agreementId: 'temp', // Será substituído ao salvar
            number: i,
            dueDate: currentDate.toISOString(),
            amount: parseFloat(amount.toFixed(2)),
            status: 'PENDING',
            paidAmount: 0
        });

        // Próxima data
        let daysToAdd = 30;
        if (frequency === 'WEEKLY') daysToAdd = 7;
        if (frequency === 'BIWEEKLY') daysToAdd = 15;
        
        currentDate = addDaysUTC(currentDate, daysToAdd);
    }

    return { installments, negotiatedTotal: parseFloat(negotiatedTotal.toFixed(2)) };
};
