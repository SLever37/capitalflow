
import { LoanBillingModality } from "../../../types";
import { ModalityStrategy } from "./types";

import { monthlyStrategy } from "./monthly/index";
import { dailyFreeStrategy } from "./dailyFree/index";
import { dailyFixedTermStrategy } from "./dailyFixedTerm/index";

// Mapeamento Oficial
const strategies: Record<string, ModalityStrategy> = {
    'MONTHLY': monthlyStrategy,
    'DAILY_FREE': dailyFreeStrategy,
    'DAILY_FIXED_TERM': dailyFixedTermStrategy,
};

// Fallback Map para compatibilidade de dados legados (Migração segura)
const legacyFallback: Record<string, ModalityStrategy> = {
    'DAILY_30_INTEREST': dailyFreeStrategy,
    'DAILY_30_CAPITAL': dailyFreeStrategy,
    'DAILY_FIXED': dailyFreeStrategy,
    'DAILY': monthlyStrategy 
};

export const modalityRegistry = {
    get(billingCycle: LoanBillingModality | string): ModalityStrategy {
        // 1. Tenta pegar a estratégia oficial
        const strategy = strategies[billingCycle];
        if (strategy) return strategy;

        // 2. Se não existir, tenta o fallback para legados
        if (legacyFallback[billingCycle]) {
            return legacyFallback[billingCycle];
        }

        // 3. Último caso, retorna mensal para não quebrar
        return monthlyStrategy; 
    }
};
