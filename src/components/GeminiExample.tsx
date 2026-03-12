
import React, { useState } from 'react';
import { geminiGatewayService } from '@/services/geminiGateway.service';
import { Loader2, Send } from 'lucide-react';

export const GeminiExample: React.FC = () => {
  const [prompt, setPrompt] = useState('Olá Gemini! Como você está hoje?');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await geminiGatewayService.testGenerateContent(prompt);
      if (result.success) {
        setResponse(result.text || 'Sem resposta.');
      } else {
        setError(result.error || 'Erro desconhecido.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar requisição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Send className="h-5 w-5 text-blue-600" />
        Teste Gemini via Cloudflare Gateway
      </h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Prompt</label>
          <textarea
            className="w-full min-h-[100px] p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Digite seu prompt aqui..."
          />
        </div>

        <button 
          onClick={handleTest} 
          disabled={loading || !prompt.trim()}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg flex items-center justify-center transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Enviar para Gemini
            </>
          )}
        </button>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            <strong>Erro:</strong> {error}
          </div>
        )}

        {response && (
          <div className="p-4 rounded-lg bg-gray-50 text-gray-800 text-sm border border-gray-200 whitespace-pre-wrap">
            <strong className="block mb-2 text-gray-900">Resposta do Gemini:</strong>
            <div className="leading-relaxed">{response}</div>
          </div>
        )}
      </div>
    </div>
  );
};
