import { GoogleGenAI } from "npm:@google/genai@0.2.1";

// Fix: Declare Deno global to resolve TypeScript errors
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: any) => {
  // Handle CORS preflight
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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, context } = body;

    if (!text) {
        return new Response(
        JSON.stringify({ intent: "ERROR", feedback: "Texto de entrada vazio." }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Prompt do Sistema (Persona e Regras)
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

    // Monta o prompt do usuário com os dados de contexto injetados
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

    // gemini-3-pro-preview recommended for complex reasoning
    const model = 'gemini-3-pro-preview'; 
    
    const response = await ai.models.generateContent({
      model: model,
      contents: userPrompt, // Passa string direta (SDK novo aceita)
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.4
      }
    });

    let cleanJson = response.text || '{}';
    
    // Limpeza de markdown caso o modelo retorne ```json ... ```
    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

    // Validação básica se é JSON válido
    try {
        JSON.parse(cleanJson);
    } catch (e) {
        console.error("Invalid JSON from AI:", cleanJson);
        throw new Error("IA retornou formato inválido.");
    }

    return new Response(cleanJson, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("AI Function Error:", error);
    return new Response(
      JSON.stringify({ 
        intent: "ERROR", 
        feedback: "Erro no processamento da IA no servidor.", 
        analysis: error.message 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});