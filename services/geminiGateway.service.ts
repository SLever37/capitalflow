
import { GoogleGenAI } from "@google/genai";

/**
 * Serviço isolado para integração com Google Gemini via Cloudflare AI Gateway.
 */
export const geminiGatewayService = {
  /**
   * Inicializa o cliente Gemini configurado com o AI Gateway da Cloudflare.
   */
  getClient() {
    const accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID;
    const gatewayName = import.meta.env.VITE_GATEWAY_NAME;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY; // Seguindo as diretrizes de segurança do projeto

    if (!accountId || !gatewayName) {
      console.warn("Cloudflare AI Gateway não configurado (ACCOUNT_ID ou GATEWAY_NAME ausentes).");
    }

    // A URL base segue o padrão solicitado: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/google-ai-studio
    const baseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayName}/google-ai-studio`;
    const aigToken = import.meta.env.VITE_CF_AIG_TOKEN;

    return new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        baseUrl: baseUrl,
        headers: aigToken ? {
          "cf-aig-authorization": `Bearer ${aigToken}`
        } : undefined
      }
    });
  },

  /**
   * Função de teste para gerar conteúdo.
   * Modelo: gemini-2.5-flash
   */
  async testGenerateContent(prompt: string) {
    try {
      const ai = this.getClient();
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return {
        success: true,
        text: response.text,
      };
    } catch (error: any) {
      console.error("Erro ao chamar Gemini via Gateway:", error);
      return {
        success: false,
        error: error.message || "Erro desconhecido na geração de conteúdo",
      };
    }
  }
};
