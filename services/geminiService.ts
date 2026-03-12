import { GoogleGenAI, Type } from "@google/genai";

/**
 * Tipos e Interfaces existentes para manter compatibilidade com o sistema atual.
 */
export type AIPersona =
  | 'OPERATOR_CRO'
  | 'TEAM_LEADER'
  | 'CLIENT_MENTOR'
  | 'PERSONAL_CFO';

export interface AIResponse {
  ok?: boolean;
  intent: string;
  feedback: string;
  analysis?: string;
  data?: any;
  suggestions?: string[];
  riskScore?: number;
}

function resolvePersona(context: any): AIPersona {
  if (context?.type === 'PORTAL_CLIENT') return 'CLIENT_MENTOR';
  if (context?.type === 'TEAM_PAGE') return 'TEAM_LEADER';
  if (context?.type === 'PERSONAL_FINANCE') return 'PERSONAL_CFO';
  return 'OPERATOR_CRO';
}

function getSystemInstruction(persona: AIPersona): string {
  switch (persona) {
    case 'CLIENT_MENTOR':
      return "Você é um mentor financeiro para clientes. Seja educado, encorajador e dê dicas financeiras claras e úteis.";
    case 'TEAM_LEADER':
      return "Você é um líder de equipe de vendas/cobrança. Dê conselhos sobre como melhorar a performance e gerenciar a equipe.";
    case 'PERSONAL_CFO':
      return "Você é um CFO pessoal. Analise as finanças com foco em longo prazo, liquidez e redução de riscos.";
    case 'OPERATOR_CRO':
    default:
      return "Você é um Chief Risk Officer (CRO) de uma empresa de crédito. Analise a carteira de empréstimos, aponte riscos, forneça um score de saúde (0 a 100) e dê sugestões de ações.";
  }
}

/**
 * Função existente utilizada pelo Dashboard e outras áreas do sistema.
 * Mantida para garantir que o sistema não quebre.
 */
export const processNaturalLanguageCommand = async (
  text: string,
  context: any
): Promise<AIResponse> => {
  try {
    const persona = resolvePersona(context);
    const systemInstruction = getSystemInstruction(persona);

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return {
        intent: 'ERROR',
        feedback: 'Chave da API do Gemini não configurada.',
      };
    }

    const callWithRetry = async (maxRetries = 5, initialDelay = 2000) => {
      let lastError: any;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Comando: ${text}\n\nContexto dos dados:\n${JSON.stringify(context, null, 2)}`,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  intent: {
                    type: Type.STRING,
                    description: "A intenção ou status principal da análise (ex: 'Risco Alto', 'Saudável', 'Atenção')",
                  },
                  feedback: {
                    type: Type.STRING,
                    description: "Um resumo rápido ou feedback direto.",
                  },
                  analysis: {
                    type: Type.STRING,
                    description: "A análise detalhada do contexto fornecido.",
                  },
                  suggestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                    },
                    description: "Lista de sugestões acionáveis.",
                  },
                  riskScore: {
                    type: Type.NUMBER,
                    description: "Uma pontuação de risco ou saúde de 0 a 100.",
                  },
                },
                required: ["intent", "feedback", "analysis", "suggestions", "riskScore"],
              },
            },
          });
          return response;
        } catch (err: any) {
          lastError = err;
          if (err.message?.includes('429') || err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
            const delay = initialDelay * Math.pow(2, i);
            console.warn(`Quota excedida (429). Tentativa ${i + 1} de ${maxRetries}. Retentando em ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    };

    const response = await callWithRetry();
    const responseText = response.text;
    if (!responseText) throw new Error("Resposta vazia da IA");
    const parsedData = JSON.parse(responseText);

    return {
      ok: true,
      intent: parsedData.intent,
      feedback: parsedData.feedback,
      analysis: parsedData.analysis,
      suggestions: parsedData.suggestions,
      riskScore: parsedData.riskScore,
    };
  } catch (e: any) {
    console.error("Erro no processNaturalLanguageCommand:", e);
    const isQuotaError = e.message?.includes('429') || e.status === 429 || e.message?.includes('RESOURCE_EXHAUSTED');
    return {
      intent: 'ERROR',
      feedback: isQuotaError 
        ? 'Limite de uso da IA atingido (Quota). Por favor, aguarde um momento e tente novamente.' 
        : 'Falha inesperada ao processar IA.',
    };
  }
};

// =============================================================================
// NOVA INTEGRAÇÃO: CLOUDFLARE AI GATEWAY + GEMINI (FETCH NATIVO)
// =============================================================================

/**
 * Nova função solicitada para integração direta via Cloudflare AI Gateway.
 * Utiliza fetch nativo e variáveis de ambiente do Vite.
 * 
 * @param prompt Texto a ser enviado para a IA
 * @returns Resposta em texto da IA ou mensagem de erro
 */
export async function askGemini(prompt: string): Promise<string> {
  try {
    // 1. Ler as variáveis de ambiente do Vite
    const accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID;
    const gatewayName = import.meta.env.VITE_GATEWAY_NAME;
    const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const cfAigToken = import.meta.env.VITE_CF_AIG_TOKEN;

    // Verificação de configuração básica
    if (!accountId || !gatewayName || !googleApiKey) {
      console.error("Configurações da IA ausentes no ambiente.");
      return "Erro ao consultar IA";
    }

    // 2. Montar a URL do Cloudflare AI Gateway
    const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayName}/google-ai-studio`;
    
    // Endpoint para o modelo gemini-2.5-flash
    const endpoint = `${gatewayUrl}/v1/models/gemini-2.5-flash:generateContent`;

    // 3. Enviar requisição para o modelo Gemini via POST
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': googleApiKey,
        'cf-aig-authorization': `Bearer ${cfAigToken}`
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na resposta do Gateway (${response.status}):`, errorText);
      return "Erro ao consultar IA";
    }

    const data = await response.json();

    // 4. Retornar apenas o texto da resposta
    // Estrutura: response.candidates[0].content.parts[0].text
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== 'string') {
      console.error("Resposta da IA não contém o campo de texto esperado:", data);
      return "Erro ao consultar IA";
    }

    return text;
  } catch (error) {
    // 5. Tratar erros sem quebrar o app
    console.error("Erro ao consultar Gemini via Cloudflare Gateway:", error);
    return "Erro ao consultar IA";
  }
}
