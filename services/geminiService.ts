
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
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: text }] }],
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
        // Fallback para Flash se PRO estiver sem cota (429) ou indisponível
        const errStr = String(err);
        if (err.status === 429 || err.code === 429 || errStr.includes('429') || errStr.includes('quota')) {
            console.warn("Gemini Pro Quota Exceeded. Switching to Flash.");
            response = await callAI('gemini-3-flash-preview');
        } else {
            throw err;
        }
    }

    let cleanJson = response.text || '{}';
    cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);

  } catch (error: any) {
    console.error("AI CRO Error:", error);
    
    const errStr = String(error);
    if (error.status === 429 || error.code === 429 || errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
        return { 
            intent: "ERROR",
            feedback: "Muitas requisições. A IA precisa descansar.", 
            analysis: "Cota de uso da API excedida (Erro 429). Por favor, aguarde um minuto e tente novamente." 
        };
    }

    return { 
        intent: "ERROR",
        feedback: "Erro ao consultar minha base neural.", 
        analysis: "Não consegui processar os dados agora. Tente novamente mais tarde." 
    };
  }
};
