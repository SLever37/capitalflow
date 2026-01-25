
import { Loan } from "../../../types";
import { ModalityPaymentConfig } from "./types";
import { paymentFlowGiro } from "./giro/paymentFlow.giro";
import { paymentFlowDiarioA } from "./diarioA/paymentFlow.diarioA";
import { paymentFlowFixedTerm } from "./fixedTerm/paymentFlow.fixedTerm";

export const paymentModalityDispatcher = {
    getConfig(loan: Loan): ModalityPaymentConfig {
        switch (loan.billingCycle) {
            case 'MONTHLY':
                return paymentFlowGiro;
            case 'DAILY_FREE':
                return paymentFlowDiarioA;
            case 'DAILY_FIXED_TERM':
                return paymentFlowFixedTerm;
            // Fallback para tipos legados ou desconhecidos
            default:
                // Se for um tipo legado mapeado para DAILY_FREE logicamente, usa fluxo A
                if (['DAILY_30_INTEREST', 'DAILY_30_CAPITAL', 'DAILY_FIXED'].includes(loan.billingCycle as string)) {
                    return paymentFlowDiarioA;
                }
                return paymentFlowGiro;
        }
    }
};
