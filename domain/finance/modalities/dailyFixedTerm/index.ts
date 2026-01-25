
import { ModalityStrategy } from "../types";
import { calculateDailyFixedTerm } from "./calculations";
import { renewDailyFixedTerm } from "./renewal";
import { calculateDailyFixedTermInstallments } from "../../../../features/loans/modalities/daily/daily.calculations";
import { parseDateOnlyUTC, todayDateOnlyUTC } from "../../../../utils/dateHelpers";

export const dailyFixedTermStrategy: ModalityStrategy = {
    key: 'DAILY_FIXED_TERM',
    
    calculate: calculateDailyFixedTerm,
    renew: renewDailyFixedTerm,
    
    generateInstallments: (params) => {
        return calculateDailyFixedTermInstallments(
            params.principal, 
            params.rate, 
            params.startDate, 
            params.fixedDuration || '15',
            (params.initialData as any)?.skipWeekends || false
        );
    },

    card: {
        dueDateLabel: (inst, loan) => {
            if (!loan) return "Vencimento";
            
            const start = parseDateOnlyUTC(loan.startDate).getTime();
            const end = parseDateOnlyUTC(inst.dueDate).getTime();
            const now = todayDateOnlyUTC().getTime();
            
            // Cálculo de Dias (Math.ceil para arredondar para cima qualquer fração)
            const msPerDay = 1000 * 60 * 60 * 24;
            const totalDays = Math.round((end - start) / msPerDay);
            
            // Dia Atual = (Hoje - Inicio) + 1
            // Ex: Começou hoje (0 diff) = Dia 1
            const currentDayIndex = Math.floor((now - start) / msPerDay) + 1;
            
            if (currentDayIndex > totalDays) return `Fim do Prazo (+${currentDayIndex - totalDays}d)`;
            if (currentDayIndex < 1) return `Inicia em ${Math.abs(currentDayIndex)}d`;
            
            return `Dia ${currentDayIndex} / ${totalDays}`;
        },
        statusLabel: (inst, daysDiff) => {
            // daysDiff > 0 significa que HOJE é depois do VENCIMENTO
            if (daysDiff > 0) return { text: "PRAZO ENCERRADO", color: "text-rose-500" };
            return { text: "PRAZO CORRENDO", color: "text-blue-400" };
        },
        showProgress: false // Usa parcela única
    }
};
