
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
    - Top Inadimplentes: ${JSON.stringify(portfolioContext.topInadimplentes)}

    REGRAS DE RESPOSTA:
    1. Se for uma análise inicial, aponte quem são os maiores riscos agora e quais contratos vão vencer em breve.
    2. Se houver muitos atrasos, aja como um "Juiz" severo pedindo foco em cobrança.
    3. Responda dúvidas técnicas sobre juros e fluxo de caixa.
    4. Mantenha um parágrafo denso de análise estratégica.

    RETORNE SEMPRE JSON:
    {
      "feedback": "Resposta curta de interação.",
      "analysis": "Análise profunda, julgamento e recomendações práticas."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: text,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.4
      }
    });

    let cleanJson = response.text || '{}';
    cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI CRO Error:", error);
    return { feedback: "Erro ao consultar minha base neural.", analysis: "Não consegui processar os dados agora." };
  }
};
