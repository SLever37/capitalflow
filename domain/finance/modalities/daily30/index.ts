
import { ModalityStrategy } from "../types";
import { calculateDaily30 } from "./daily30.calculations";
import { renewDaily30 } from "./daily30.renewal";
import { calculateNewDailyInstallments } from "../../../../features/loans/modalities/daily/daily.calculations";

export const daily30Strategy: ModalityStrategy = {
    key: 'DAILY_30_INTEREST', // Handles both ideally, but registry maps keys
    
    calculate: calculateDaily30,
    renew: renewDaily30,
    
    generateInstallments: (params) => {
        // Assume DAILY_30_INTEREST as default for this module file, registry handles mapping
        return calculateNewDailyInstallments(
            'DAILY_30_INTEREST',
            params.principal, 
            params.rate, 
            params.startDate, 
            '30',
            params.initialData?.installments?.[0]?.id
        );
    },

    card: {
        dueDateLabel: () => "Vencimento",
        statusLabel: () => null,
        showProgress: false
    }
};
