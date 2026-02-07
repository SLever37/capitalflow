import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";

/**
 * Envia o comando e o contexto para a Edge Function 'ai-assistant'.
 * Se falhar (erro de conexão ou função ausente), tenta executar localmente via SDK Client-side (Fallback).
 */
export const processNaturalLanguageCommand = async (text: string, portfolioContext: any) => {
  try {
    // 1. Tentativa Principal: Edge Function (Server-side)
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        text,
        context: portfolioContext
      }
    });

    if (error) {
      console.warn("Edge Function Error (Falling back to client-side):", error);
      throw error; // Força cair no catch para tentar local
    }

    return data;

  } catch (edgeError: any) {
    // 2. Fallback: Execução Local (Client-side)
    // Só funciona se a chave estiver configurada no .env local e injetada pelo Vite
    const apiKey = process.env.API_KEY;

    if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') {
        console.info("Usando Fallback Local de IA...");
        try {
            const ai = new GoogleGenAI({ apiKey });
            
            // Recria o prompt do sistema (espelhando a Edge Function)
            const systemInstruction = `
            Você é o CRO (Chief Risk Officer) e Auditor Senior do CapitalFlow. 
            Sua missão é julgar a saúde financeira da carteira de empréstimos do operador.
            Seja analítico, as vezes cético e sempre focado em preservação de capital.

            REGRAS DE RESPOSTA:
            1. Identifique a intenção do usuário:
               - 'ANALYZE_PORTFOLIO': Perguntas sobre status, lucro, riscos, resumo, "como estou", "analise minha carteira".
               - 'REGISTER_CLIENT': Intenção de cadastrar alguém. Extraia nome e telefone se houver.
               - 'REGISTER_PAYMENT': Intenção de registrar pagamento. Extraia nome e valor.
               - 'ADD_REMINDER': Agendar lembrete.
            
            2. Se for análise ('ANALYZE_PORTFOLIO'):
               - Use os DADOS FORNECIDOS para apontar riscos.
               - Se houver muitos atrasos, aja como um "Juiz" severo pedindo foco em cobrança.
               - Mantenha um parágrafo denso de análise estratégica no campo 'analysis'.

            RETORNE SEMPRE JSON NESTE FORMATO (SEM MARKDOWN):
            {
              "intent": "ANALYZE_PORTFOLIO" | "REGISTER_CLIENT" | "REGISTER_PAYMENT" | "ADD_REMINDER" | "UNKNOWN",
              "data": { "name": "...", "amount": 0, "phone": "..." }, 
              "feedback": "Resposta curta de interação (1 frase).",
              "analysis": "Análise profunda, julgamento e recomendações práticas (Apenas para ANALYZE_PORTFOLIO)."
            }
            `;

            const userPrompt = `
            DADOS ATUAIS DA CARTEIRA:
            - Capital Ativo na Rua: R$ ${portfolioContext?.totalLent?.toFixed(2) || '0.00'}
            - Lucro Líquido p/ Saque: R$ ${portfolioContext?.interestBalance?.toFixed(2) || '0.00'}
            - Contratos em Atraso: ${portfolioContext?.lateCount || 0}
            - Top Inadimplentes: ${JSON.stringify(portfolioContext?.topLateLoans || [])}
            - Fluxo Mensal: ${JSON.stringify(portfolioContext?.monthFlow || {})}

            MENSAGEM DO USUÁRIO:
            "${text}"
            `;

            // Changed to flash-preview to avoid quota exhaustion (429) on preview tier
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview', 
              contents: userPrompt,
              config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                temperature: 0.4
              }
            });

            let cleanJson = response.text || '{}';
            cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            return JSON.parse(cleanJson);

        } catch (localError: any) {
            console.error("Local AI Error:", localError);
            
            // Tratamento aprimorado de erro para exibir mensagem útil na UI
            let msg = localError.message || (localError.error && localError.error.message) || JSON.stringify(localError);
            
            if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
                msg = "Cota da IA excedida (429). Aguarde alguns instantes ou verifique seu plano.";
            }

            return { 
                intent: "ERROR", 
                feedback: "Falha na IA: " + msg, 
                analysis: "Verifique sua API Key ou conexão." 
            };
        }
    }

    // Se falhar tudo (Edge e sem chave local)
    console.error("AI Service Critical Failure:", edgeError);
    return { 
        intent: "ERROR",
        feedback: "Erro de conexão com o Assistente (Edge Function indisponível e sem chave local).", 
        analysis: "Não foi possível processar sua solicitação no momento. Verifique sua conexão ou configuração de backend." 
    };
  }
};