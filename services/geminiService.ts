
import { supabase } from '../lib/supabase';

/**
 * Envia o comando e o contexto para a Edge Function 'ai-assistant'.
 * A lógica de IA agora roda no servidor (Supabase), protegendo a chave de API.
 */
export const processNaturalLanguageCommand = async (text: string, portfolioContext: any) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        text,
        context: portfolioContext
      }
    });

    if (error) {
      console.error("Edge Function Error:", error);
      throw new Error(error.message || "Erro ao conectar com a IA.");
    }

    // A Edge Function já retorna o JSON formatado ou um objeto de erro tratado
    return data;

  } catch (error: any) {
    console.error("AI Service Error:", error);
    
    return { 
        intent: "ERROR",
        feedback: "Erro de conexão com o Assistente.", 
        analysis: "Não foi possível processar sua solicitação no momento. Verifique sua conexão." 
    };
  }
};
