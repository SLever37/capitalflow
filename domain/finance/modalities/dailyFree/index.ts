
import { ModalityStrategy } from "../types";
import { calculateDailyFree } from "./dailyFree.calculations";
import { renewDailyFree } from "./dailyFree.renewal";
import { calculateNewDailyInstallments } from "../../../../features/loans/modalities/daily/daily.calculations";

export const dailyFreeStrategy: ModalityStrategy = {
    key: 'DAILY_FREE',
    
    calculate: calculateDailyFree,
    renew: renewDailyFree,
    
    generateInstallments: (params) => {
        return calculateNewDailyInstallments(
            'DAILY_FREE',
            params.principal, 
            params.rate, 
            params.startDate, 
            '0', // Duration ignored for Free
            params.initialData?.installments?.[0]?.id,
            (params.initialData as any)?.skipWeekends || false
        );
    },

    card: {
        dueDateLabel: () => "Pago até:",
        statusLabel: (inst, daysDiff) => {
            return null; 
        },
        showProgress: false
    }
};
