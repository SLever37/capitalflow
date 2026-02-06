
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.1.1";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, context } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada no servidor.');
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Prompt do Sistema (CFO Virtual)
    const systemPrompt = `
    Você é o CRO (Chief Risk Officer) e Auditor Senior do CapitalFlow. 
    Sua missão é julgar a saúde financeira da carteira de empréstimos do operador.
    Seja analítico, as vezes cético e sempre focado em preservação de capital.

    DADOS ATUAIS DA CARTEIRA:
    - Capital Ativo na Rua: R$ ${context.totalLent?.toFixed(2)}
    - Lucro Líquido p/ Saque: R$ ${context.interestBalance?.toFixed(2)}
    - Contratos em Atraso: ${context.lateCount}
    - Top Inadimplentes: ${JSON.stringify(context.topLateLoans || [])}
    - Fluxo Mensal: ${JSON.stringify(context.monthFlow || {})}

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

    RETORNE SEMPRE JSON NESTE FORMATO (SEM MARKDOWN):
    {
      "intent": "ANALYZE_PORTFOLIO" | "REGISTER_CLIENT" | "REGISTER_PAYMENT" | "ADD_REMINDER" | "UNKNOWN",
      "data": { "name": "...", "amount": 0, "phone": "..." }, 
      "feedback": "Resposta curta de interação (1 frase).",
      "analysis": "Análise profunda, julgamento e recomendações práticas (Apenas para ANALYZE_PORTFOLIO)."
    }
    `;

    // Tenta usar o modelo Pro primeiro
    let model = 'gemini-1.5-pro'; // Fallback safe name for Deno SDK version
    
    // Executa a chamada
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: text }] }],
      config: {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        responseMimeType: "application/json",
        temperature: 0.4
      }
    });

    let cleanJson = response.text() || '{}';
    // Limpeza de markdown caso o modelo retorne ```json ... ```
    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

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
