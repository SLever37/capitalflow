import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";

export const processNaturalLanguageCommand = async (text: string, portfolioContext: any) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { text, context: portfolioContext },
    });
    if (!error && data) return data;
  } catch (e) {}

  if (!process.env.API_KEY || process.env.API_KEY === 'PLACEHOLDER_API_KEY') {
    return { intent: 'ERROR', feedback: 'IA Indisponível.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Determinação de Persona Superior
    let systemInstruction = "";
    if (portfolioContext?.type === 'PORTAL_CLIENT') {
      systemInstruction = "Você é um Mentor de Prosperidade e Educação Financeira. Sua missão é ensinar o cliente a organizar sua vida financeira, sair das dívidas e prosperar. Seja empático, use analogias inteligentes e dê conselhos práticos sobre economia doméstica. Retorne JSON.";
    } else {
      systemInstruction = "Você é um Chief Risk Officer (CRO) e Auditor de Alta Performance. Sua linguagem é técnica, intelectual e focada em métricas de risco, liquidez e saúde de ativos. Não faça chat, gere relatórios analíticos profundos. Retorne JSON.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `CONTEXTO: ${JSON.stringify(portfolioContext)}. COMANDO: "${text}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("Vazio");
    return JSON.parse(textOutput.replace(/```json|```/g, '').trim());
  } catch (e) {
    return { intent: 'ERROR', feedback: 'Falha na rede neural.' };
  }
};