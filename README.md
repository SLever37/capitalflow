
# CapitalFlow - Sistema de Gestão Financeira

O **CapitalFlow** é uma plataforma completa para gestão de empréstimos privados, controle de capital de giro e análise de risco com Inteligência Artificial.

## 🚀 Funcionalidades Principais

- **Gestão de Contratos**: Criação de empréstimos (Giro Mensal ou Diário), amortização e refinanciamento.
- **Inteligência Artificial**: Integração com Gemini AI para análise de risco e geração de mensagens de cobrança.
- **Portal do Cliente**: Área exclusiva para clientes visualizarem débitos e enviarem comprovantes via PIX.
- **Financeiro Avançado**: DRE (Demonstrativo de Resultado), Fluxo de Caixa e Extratos detalhados.
- **Segurança**: Login criptografado, RLS (Row Level Security) e Auditoria de transações.

## 🛠️ Instalação e Deploy (Produção)

Este projeto está configurado para rodar em arquitetura Serverless (Vite + React + Supabase).

### Pré-requisitos
1.  Conta no [Supabase](https://supabase.com) (Banco de Dados).
2.  Conta no [Cloudflare Pages](https://pages.cloudflare.com) (Hospedagem).
3.  Chave de API do Google Gemini (para funções de IA).

### Passo 1: Configuração do Banco de Dados
Execute os scripts SQL contidos na pasta raiz no painel do Supabase para criar as tabelas e funções de segurança.

### Passo 2: Variáveis de Ambiente
No painel de hospedagem (Cloudflare/Vercel), configure:

| Variável | Descrição |
| :--- | :--- |
| `GEMINI_API_KEY` | Sua chave da Google AI |
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (Anon) do Supabase |

### Passo 3: Comandos Locais

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Gerar versão de produção
npm run build
```

---
*Versão 3.0.0 - Stable Release*
