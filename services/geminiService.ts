import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";

export type AIPersona = 'OPERATOR_CRO' | 'TEAM_LEADER' | 'CLIENT_MENTOR' | 'PERSONAL_CFO';

export interface AIResponse {
  intent: string;
  feedback: string;
  analysis?: string;
  data?: any;
  suggestions?: string[];
  riskScore?: number; // 0-100
}

export const processNaturalLanguageCommand = async (text: string, context: any): Promise<AIResponse> => {
  // 1. Tenta via Edge Function (Segurança)
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { text, context },
    });
    if (!error && data) return data;
  } catch (e) {
    console.warn("[IA] Falha na Edge Function, usando fallback local...");
  }

  // 2. Fallback via SDK Local (Se configurado)
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    return { 
      intent: 'ERROR', 
      feedback: 'Assistente offline. Configure sua chave de API.' 
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const isDemo = context?.isDemo || false;
    
    // Define a Persona baseada no contexto enviado
    const persona: AIPersona = context?.type === 'PORTAL_CLIENT' ? 'CLIENT_MENTOR' : 
                            context?.type === 'TEAM_PAGE' ? 'TEAM_LEADER' :
                            context?.type === 'PERSONAL_FINANCE' ? 'PERSONAL_CFO' : 'OPERATOR_CRO';

    let systemInstruction = "";

    switch (persona) {
      case 'OPERATOR_CRO':
        systemInstruction = `Você é o Chief Risk Officer (CRO) da CapitalFlow. Analise a carteira de empréstimos com foco em liquidez, inadimplência e preservação de capital. Seja técnico e direto. ${isDemo ? "Nota: Este é um ambiente de DEMONSTRAÇÃO com dados simulados." : ""}`;
        break;
      case 'TEAM_LEADER':
        systemInstruction = `Você é um Gestor de Performance de Equipe. Sua missão é analisar a atividade dos operadores, identificar gargalos de produtividade e sugerir metas. Foco em engajamento e volume operado.`;
        break;
      case 'CLIENT_MENTOR':
        systemInstruction = `Você é um Mentor de Prosperidade Financeira. Ajude o cliente a entender sua dívida não como um peso, mas como um degrau. Sugira planos de economia doméstica com empatia e motivação.`;
        break;
      case 'PERSONAL_CFO':
        systemInstruction = `Você é um CFO Pessoal de elite. Analise gastos, categorias de consumo e saldos para sugerir investimentos ou cortes estratégicos. Seja transformador.`;
        break;
    }

    const model = 'gemini-3-flash-preview';
    const prompt = `
      CONTEXTO DO SISTEMA: ${JSON.stringify(context)}
      COMANDO OU DADOS DO USUÁRIO: "${text}"
      
      RETORNE APENAS JSON NO FORMATO:
      {
        "intent": "string",
        "feedback": "string",
        "analysis": "string (análise densa e estratégica)",
        "suggestions": ["sugestão 1", "sugestão 2"],
        "riskScore": number (0 a 100, se aplicável),
        "data": {}
      }
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.5
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("Resposta vazia da IA.");
    
    return JSON.parse(textOutput.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error("[IA] Erro Crítico:", e);
    return { 
      intent: 'ERROR', 
      feedback: 'Tive uma falha no processamento neural. Tente novamente em instantes.' 
    };
  }
};