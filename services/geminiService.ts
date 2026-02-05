
import { GoogleGenAI } from "@google/genai";
import { Loan, Client } from "../types";
import { calculateTotalDue, getDaysDiff } from "../domain/finance/calculations";

const getAIClient = () => {
  const key = process.env.API_KEY;
  if (!key || key === 'undefined' || key.includes('PLACEHOLDER')) return null;
  return new GoogleGenAI({ apiKey: key });
};

export const processNaturalLanguageCommand = async (text: string, portfolioContext: any) => {
  const ai = getAIClient();
  if (!ai) return { intent: "UNKNOWN", feedback: "IA não configurada." };

  const systemPrompt = `
    Você é o CRO (Chief Risk Officer) e Auditor Senior do CapitalFlow. 
    Sua missão é julgar a saúde financeira da carteira de empréstimos do operador.
    Seja analítico, as vezes cético e sempre focado em preservação de capital.

    DADOS ATUAIS DA CARTEIRA:
    - Capital Ativo na Rua: R$ ${portfolioContext.totalLent?.toFixed(2)}
    - Lucro Líquido p/ Saque: R$ ${portfolioContext.interestBalance?.toFixed(2)}
    - Contratos em Atraso: ${portfolioContext.lateCount}
    - Top Inadimplentes: ${JSON.stringify(portfolioContext.topLateLoans || [])}
    - Fluxo Mensal: ${JSON.stringify(portfolioContext.monthFlow || {})}

    REGRAS DE RESPOSTA:
    1. Identifique a intenção do usuário:
       - 'ANALYZE_PORTFOLIO': Perguntas sobre status, lucro, riscos, resumo.
       - 'REGISTER_CLIENT': Intenção de cadastrar alguém. Extraia nome e telefone se houver.
       - 'REGISTER_PAYMENT': Intenção de registrar pagamento. Extraia nome e valor.
       - 'ADD_REMINDER': Agendar lembrete.
    
    2. Se for análise ('ANALYZE_PORTFOLIO'):
       - Aponte quem são os maiores riscos agora.
       - Se houver muitos atrasos, aja como um "Juiz" severo pedindo foco em cobrança.
       - Mantenha um parágrafo denso de análise estratégica no campo 'analysis'.

    RETORNE SEMPRE JSON NESTE FORMATO:
    {
      "intent": "ANALYZE_PORTFOLIO" | "REGISTER_CLIENT" | "REGISTER_PAYMENT" | "ADD_REMINDER" | "UNKNOWN",
      "data": { "name": "...", "amount": 0, "phone": "..." }, 
      "feedback": "Resposta curta de interação (1 frase).",
      "analysis": "Análise profunda, julgamento e recomendações práticas (Apenas para ANALYZE_PORTFOLIO)."
    }
  `;

  const callAI = async (modelName: string) => {
    // Simplified content structure to avoid serialization issues
    const response = await ai.models.generateContent({
      model: modelName,
      contents: text,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.4
      }
    });
    return response;
  };

  try {
    let response;
    try {
        // Tenta Modelo PRO (Melhor raciocínio)
        response = await callAI('gemini-3-pro-preview');
    } catch (err: any) {
        console.warn("Gemini Pro Error (Primary):", err);
        // Fallback para Flash se PRO falhar (Quota ou Rede)
        // Se o erro for XHR (Network), o Flash pode funcionar se for um problema temporário de endpoint específico do Pro
        response = await callAI('gemini-3-flash-preview');
    }

    let cleanJson = response?.text || '{}';
    // Remove markdown code blocks if present
    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    
    try {
        return JSON.parse(cleanJson);
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError, cleanJson);
        return { 
            intent: "UNKNOWN", 
            feedback: "Não entendi completamente. Pode reformular?",
            analysis: null
        };
    }

  } catch (error: any) {
    console.error("AI CRO Error:", error);
    
    const errStr = String(error?.message || error);
    if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
        return { 
            intent: "ERROR",
            feedback: "Muitas requisições. A IA precisa descansar.", 
            analysis: "Cota de uso da API excedida. Por favor, aguarde um minuto." 
        };
    }
    
    // Tratamento específico para erro de rede/XHR
    if (errStr.includes('xhr error') || errStr.includes('fetch failed')) {
         return {
            intent: "ERROR",
            feedback: "Erro de conexão com a IA.",
            analysis: "Verifique sua internet ou se a chave de API está válida e ativa."
         };
    }

    return { 
        intent: "ERROR",
        feedback: "Erro ao consultar minha base neural.", 
        analysis: "Não consegui processar os dados agora. Tente novamente mais tarde." 
    };
  }
};
