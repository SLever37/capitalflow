import { GoogleGenAI } from "npm:@google/genai@0.2.1";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: any) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {

    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      console.error("GEMINI_API_KEY não configurada.");

      return new Response(
        JSON.stringify({
          intent: "ERROR",
          feedback: "Erro de Configuração: API Key não encontrada no servidor."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let body;

    try {
      body = await req.json();
    } catch (e) {

      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { text, context } = body;

    if (!text) {

      return new Response(
        JSON.stringify({
          intent: "ERROR",
          feedback: "Texto de entrada vazio."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
    Você é o CRO (Chief Risk Officer) e Auditor Senior do CapitalFlow.
    Sua missão é julgar a saúde financeira da carteira de empréstimos do operador.
    Seja analítico, as vezes cético e sempre focado em preservação de capital.

    RETORNE SEMPRE UM JSON NO SEGUINTE FORMATO:
    {
      "intent": "ANALYZE_PORTFOLIO" | "ERROR",
      "riskScore": number (0-100),
      "feedback": "Resumo curto da análise",
      "analysis": "Análise detalhada e profunda",
      "suggestions": ["Sugestão 1", "Sugestão 2"]
    }
    `;

    const userPrompt = `
    DADOS ATUAIS DA CARTEIRA:
    - Capital Ativo na Rua: R$ ${context?.totalLent?.toFixed(2) || '0.00'}
    - Lucro Líquido p/ Saque: R$ ${context?.interestBalance?.toFixed(2) || '0.00'}
    - Contratos em Atraso: ${context?.lateCount || 0}
    - Top Inadimplentes: ${JSON.stringify(context?.topLateLoans || [])}
    - Fluxo Mensal: ${JSON.stringify(context?.monthFlow || {})}

    MENSAGEM DO USUÁRIO:
    "${text}"
    `;

    const model = 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({

      model: model,

      contents: userPrompt,

      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.4,

        // 🔥 AUMENTO DE TOKENS
        maxOutputTokens: 16384
      }
    });

    let cleanJson = response.text || '{}';

    cleanJson = cleanJson
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '')
      .trim();

    return new Response(cleanJson, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {

    console.error("Erro na Edge Function:", error);

    return new Response(
      JSON.stringify({
        intent: "ERROR",
        feedback: `Erro interno na função de IA: ${(error as any).message || 'Erro desconhecido'}`
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
