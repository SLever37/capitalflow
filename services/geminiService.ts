
import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";

/**
 * Envia o comando e o contexto para a Edge Function 'ai-assistant'.
 * Se falhar (erro de conexão ou função ausente), tenta executar localmente via SDK Client-side (Fallback).
 */
export const processNaturalLanguageCommand = async (text: string, context: any) => {
  try {
    // 1. Tentativa Principal: Edge Function (Server-side)
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        text,
        context
      }
    });

    if (error) {
      console.warn("Edge Function Error (Falling back to client-side):", error);
      throw error; // Força cair no catch para tentar local
    }

    return data;

  } catch (edgeError: any) {
    // 2. Fallback: Execução Local (Client-side)
    const apiKey = process.env.API_KEY;

    if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') {
        console.info("Usando Fallback Local de IA...");
        try {
            const ai = new GoogleGenAI({ apiKey });
            
            // Determina se é contexto Financeiro Pessoal ou Gestão de Empréstimos
            const isPersonalFinance = context?.type === 'PERSONAL_FINANCE';

            const systemInstruction = isPersonalFinance ? `
            Você é um Consultor Financeiro Pessoal Inteligente do CapitalFlow.
            Sua missão é ajudar o usuário a gerenciar suas finanças pessoais (cartões, contas, gastos).
            
            INTENÇÕES PERMITIDAS:
            - 'PF_ADD_TRANSACTION': Registrar gasto ou receita. Extraia: description, amount, type (DESPESA/RECEITA), category.
            - 'PF_ADD_ASSET': Criar nova conta ou cartão. Extraia: name, type (ACCOUNT/CARD), balance/limit.
            - 'PF_REMOVE_ASSET': Remover conta ou cartão. Extraia: name.
            - 'PF_ADVICE': Análise de gastos, dicas de economia ou resposta geral.
            
            REGRAS:
            1. Se o usuário pedir para criar algo, retorne a intenção correta com os dados.
            2. Se for análise, seja breve e direto (máx 3 frases).
            3. Responda sempre em JSON estrito.
            
            FORMATO JSON:
            {
              "intent": "PF_ADD_TRANSACTION" | "PF_ADD_ASSET" | "PF_REMOVE_ASSET" | "PF_ADVICE",
              "data": { 
                  "description": "...", "amount": 0, "type": "...", "name": "...", "limit": 0, "balance": 0 
              },
              "feedback": "Texto curto para o usuário (ex: 'Criando cartão Nubank...').",
              "analysis": "Análise detalhada (apenas se solicitado)."
            }
            ` : `
            Você é o CRO (Chief Risk Officer) e Auditor Senior do CapitalFlow (Gestão de Empréstimos). 
            Sua missão é julgar a saúde financeira da carteira de empréstimos do operador.

            REGRAS DE RESPOSTA:
            1. Identifique a intenção do usuário:
               - 'ANALYZE_PORTFOLIO': Perguntas sobre status, lucro, riscos, resumo.
               - 'REGISTER_CLIENT': Intenção de cadastrar alguém. Extraia nome e telefone.
               - 'REGISTER_PAYMENT': Intenção de registrar pagamento. Extraia nome e valor.
               - 'ADD_REMINDER': Agendar lembrete.
            
            RETORNE SEMPRE JSON:
            {
              "intent": "ANALYZE_PORTFOLIO" | "REGISTER_CLIENT" | "REGISTER_PAYMENT" | "ADD_REMINDER" | "UNKNOWN",
              "data": { "name": "...", "amount": 0, "phone": "..." }, 
              "feedback": "Resposta curta de interação.",
              "analysis": "Análise profunda (Apenas para ANALYZE_PORTFOLIO)."
            }
            `;

            const userPrompt = `
            CONTEXTO ATUAL:
            ${JSON.stringify(context)}

            MENSAGEM DO USUÁRIO:
            "${text}"
            `;

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
            let msg = localError.message || "Erro desconhecido.";
            if (msg.includes('429')) msg = "Cota da IA excedida (429).";
            return { intent: "ERROR", feedback: "Falha na IA: " + msg };
        }
    }

    return { 
        intent: "ERROR",
        feedback: "Erro de conexão com o Assistente (Backend indisponível).", 
    };
  }
};
