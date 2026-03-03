import { supabase } from '../lib/supabase';

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

export const processNaturalLanguageCommand = async (
  text: string,
  context: any
): Promise<AIResponse> => {
  try {
    const persona = resolvePersona(context);

    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { text, context, persona },
    });

    // Erro de transporte (rede / 4xx/5xx)
    if (error) {
      // Tenta extrair payload útil
      const providerStatus =
        (error as any)?.context?.provider_status ||
        (data as any)?.data?.provider_status;

      if (providerStatus === 429) {
        return {
          intent: 'ERROR',
          feedback:
            'IA temporariamente indisponível (limite atingido). Tente novamente em alguns instantes.',
        };
      }

      return {
        intent: 'ERROR',
        feedback: 'Erro ao comunicar com a IA.',
      };
    }

    // Caso a Edge devolva ok:false (ex: quota)
    if (data?.ok === false) {
      if (data?.data?.provider_status === 429) {
        return {
          intent: 'ERROR',
          feedback:
            'IA temporariamente indisponível (limite atingido). Tente novamente em alguns instantes.',
        };
      }

      return {
        intent: data?.intent || 'ERROR',
        feedback: data?.feedback || 'Falha ao processar IA.',
        analysis: data?.analysis,
        suggestions: data?.suggestions,
        riskScore: data?.riskScore,
        data: data?.data,
      };
    }

    // Sucesso
    return data as AIResponse;
  } catch (e) {
    return {
      intent: 'ERROR',
      feedback: 'Falha inesperada ao processar IA.',
    };
  }
};