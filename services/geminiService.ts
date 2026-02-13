import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";

/**
 * Processa comandos em linguagem natural.
 * Prioridade: Edge Function 'ai-assistant' no Supabase.
 * Fallback: SDK Google Gemini local para redundância.
 */
export const processNaturalLanguageCommand = async (text: string, portfolioContext: any) => {
  // 1. TENTATIVA: Supabase Edge Function (Recomendado para Produção)
  try {
    // Verificamos se estamos em ambiente browser e se o supabase está ok
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { text, context: portfolioContext },
    });

    if (!error && data) {
      return data;
    }

    if (error) {
      // Logamos o erro mas não travamos o fluxo, o catch/fallback cuidará disso
      console.warn('[AI][EDGE] Função remota retornou erro ou não encontrada:', error);
    }
  } catch (e: any) {
    console.warn('[AI][EDGE] Falha na conexão com a Edge Function:', e?.message);
  }

  // 2. FALLBACK: Execução Local via SDK Gemini
  // Verificação de segurança para a API Key conforme diretrizes
  if (!process.env.API_KEY || process.env.API_KEY === 'PLACEHOLDER_API_KEY') {
    return {
      intent: 'ERROR',
      feedback: 'Assistente offline. Verifique a conexão ou a API Key.',
      analysis: 'As Edge Functions falharam e o SDK local não possui chave válida.'
    };
  }

  try {
    // Inicialização direta conforme diretrizes
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Determinação de Persona baseada no contexto
    const isPersonal = portfolioContext?.type === 'PERSONAL_FINANCE';
    const systemInstruction = isPersonal 
      ? "Consultor Financeiro Pessoal do CapitalFlow. Analise Receitas/Despesas. Retorne JSON puro."
      : "CRO e Auditor Senior do CapitalFlow. Analise carteira de empréstimos e riscos. Retorne JSON puro.";

    const userPrompt = `CONTEXTO: ${JSON.stringify(portfolioContext)}. MENSAGEM: "${text}"`;

    // Chamada direta ao generateContent conforme diretrizes
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("IA retornou resposta vazia.");

    const cleanJson = textOutput.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleanJson);

  } catch (localError: any) {
    console.error("[AI] Falha crítica no SDK local:", localError);
    return {
      intent: 'ERROR',
      feedback: 'Não foi possível processar o comando por voz no momento.',
      analysis: localError.message
    };
  }
};