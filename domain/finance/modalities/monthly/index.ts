
import { ModalityStrategy } from "../types";
import { calculateMonthly } from "./monthly.calculations";
import { renewMonthly } from "./monthly.renewal";
import { calculateMonthlyInstallments } from "../../../../features/loans/modalities/monthly/monthly.calculations";

export const monthlyStrategy: ModalityStrategy = {
    key: 'MONTHLY',
    
    calculate: calculateMonthly,
    renew: renewMonthly,
    
    generateInstallments: (params) => {
        return calculateMonthlyInstallments(
            params.principal, 
            params.rate, 
            params.startDate, 
            params.initialData?.installments?.[0]?.id
        );
    },

    card: {
        dueDateLabel: () => "Vencimento:",
        statusLabel: () => null, // Usa padrão
        showProgress: false
    }
};
