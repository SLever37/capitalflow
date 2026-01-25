
import { GoogleGenAI } from "@google/genai";
import { Loan, Client } from "../types";
import { calculateTotalDue, getDaysDiff } from "../domain/finance/calculations";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analisa o risco individual de um contrato.
 */
export const analyzeLoanRisk = async (debtor: Client, loanDetails: Partial<Loan>) => {
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise o risco para este empréstimo privado:
      Devedor: ${debtor.name}
      Documento: ${debtor.document}
      Telefone: ${debtor.phone}
      Capital: R$ ${loanDetails.principal}
      Taxa: ${loanDetails.interestRate}% AM
      Multa: ${loanDetails.finePercent}% | Mora: ${loanDetails.dailyInterestPercent}% diária.
      PIX p/ Recebimento: ${loanDetails.pixKey || 'Não informada'}
      
      Forneça uma recomendação técnica curta sobre a saúde do contrato.`,
      config: {
        systemInstruction: "Você é um analista de risco especializado em crédito privado para pequenos negócios.",
        temperature: 0.5,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Análise indisponível no momento.";
  }
};

/**
 * Gera uma mensagem de cobrança personalizada.
 */
export const getCollectionStrategy = async (loan: Loan) => {
  const pendingInstallment = loan.installments.find(i => i.status !== 'PAID');
  if (!pendingInstallment) return "O contrato está quitado.";

  const debt = calculateTotalDue(loan, pendingInstallment);
  const daysLate = Math.max(0, getDaysDiff(pendingInstallment.dueDate));
  
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma mensagem de cobrança curta para WhatsApp.
      Dados: Cliente ${loan.debtorName}, Valor R$ ${debt.total.toFixed(2)}, Atraso ${daysLate} dias.
      Tom: ${daysLate > 15 ? 'Firme e sério' : 'Amigável mas direto'}.`,
      config: { systemInstruction: "Especialista em recuperação de ativos." }
    });
    return response.text;
  } catch (error) { return "Erro ao gerar mensagem."; }
};

/**
 * Processa comandos de voz com contexto macro da carteira (CFO Virtual).
 */
export const processNaturalLanguageCommand = async (text: string, portfolioContext?: any) => {
  // Constrói string de contexto macro se disponível
  let contextPrompt = "";
  if (portfolioContext) {
      contextPrompt = `
      CONTEXTO ATUAL DA CARTEIRA:
      - Capital Total na Rua: R$ ${portfolioContext.totalLent.toFixed(2)}
      - Lucro Disponível p/ Saque: R$ ${portfolioContext.interestBalance.toFixed(2)}
      - Contratos em Atraso: ${portfolioContext.lateCount}
      - Top Inadimplentes: ${JSON.stringify(portfolioContext.topLateLoans)}
      - Fluxo do Mês: Entradas R$ ${portfolioContext.monthFlow?.in || 0}, Saídas R$ ${portfolioContext.monthFlow?.out || 0}
      `;
  }

  const systemPrompt = `
    Você é o CFO (Diretor Financeiro) Virtual do CapitalFlow. 
    Interprete o comando do usuário e retorne um JSON.
    Data de Hoje: ${new Date().toLocaleDateString('pt-BR')}.

    ${contextPrompt}

    INTENÇÕES SUPORTADAS:
    1. REGISTER_CLIENT: Cadastro de novos devedores.
    2. REGISTER_PAYMENT: Registrar pagamentos realizados.
    3. ADD_REMINDER: Lembretes na agenda.
    4. ANALYZE_PORTFOLIO: Pedidos de insight sobre a empresa (ex: "quem mais me deve?", "como estamos de juros?", "resumo da semana").

    REGRAS PARA ANALYZE_PORTFOLIO:
    - Use os dados do CONTEXTO ATUAL fornecidos acima.
    - Seja estratégico. Se houver muitos atrasos, sugere focar em cobrança antes de novos empréstimos.
    
    ESTRUTURA JSON OBRIGATÓRIA:
    {
      "intent": "REGISTER_CLIENT" | "REGISTER_PAYMENT" | "ADD_REMINDER" | "ANALYZE_PORTFOLIO" | "UNKNOWN",
      "data": { ... },
      "feedback": "Resposta direta e curta para o usuário.",
      "analysis": "Se intent for ANALYZE_PORTFOLIO, forneça aqui um parágrafo estratégico de CFO."
    }
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: text,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const cleanJson = response.text || '{}';
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI CFO Error:", error);
    return { intent: "UNKNOWN", feedback: "Desculpe, tive um problema ao analisar os dados agora." };
  }
};
