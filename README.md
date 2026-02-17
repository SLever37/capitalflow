
# CapitalFlow - Sistema de Gestão Financeira & Crédito Privado

**Versão:** 3.0.0 (Stable Release)
**Stack:** React 19 + TypeScript + Vite + Supabase + Google Gemini AI

## 📖 Visão Geral do Sistema

O **CapitalFlow** é uma Single Page Application (SPA) robusta projetada para a gestão de microcrédito, empréstimos peer-to-peer e controle de capital de giro. O sistema se destaca por integrar funcionalidades financeiras complexas com módulos jurídicos (geração de títulos executivos), comunicação em tempo real (chat/chamadas) e inteligência artificial para análise de risco.

A arquitetura foge do padrão MVC tradicional de frontends, adotando uma estrutura baseada em **Features**, **Domínios** e **Controladores**, otimizada para escalabilidade e manutenção.

---

## 🏗️ Arquitetura e Padrões de Projeto

### 1. Estrutura de Pastas (Feature-Sliced Design Adaptado)
O projeto organiza o código por funcionalidades e responsabilidades, não apenas por tipo de arquivo.

*   `features/`: Contém módulos autossuficientes (ex: `auth`, `loans`, `legal`, `support`). Cada feature encapsula seus próprios componentes, hooks e serviços.
*   `domain/`: O "coração" da lógica de negócio pura. Aqui residem as regras de cálculo financeiro, estratégias de juros e validações, totalmente desacopladas da UI (React).
*   `hooks/controllers/`: Implementação do padrão **Controller**. Hooks como `useLoanController` ou `usePaymentController` agem como intermediários entre a UI e os Serviços/Domínio, gerenciando o fluxo de dados e estados de transição.
*   `services/`: Camada de comunicação com o mundo externo (Supabase, APIs, LocalStorage). Implementa o padrão **Adapter** (`adapters/dbAdapters.ts`) para normalizar dados do banco (snake_case) para a aplicação (camelCase).

### 2. Design Patterns Identificados

*   **Strategy Pattern:** Utilizado intensivamente em `domain/finance/modalities/`. O sistema suporta múltiplas modalidades de cobrança (Mensal, Diário Livre, Diário Prazo Fixo) trocando a estratégia de cálculo e renovação em tempo de execução através do `modalityRegistry`.
*   **Observer Pattern:** Implementado via `Supabase Realtime` para sincronizar chats, notificações de pagamento e atualizações de agenda entre múltiplos operadores e o portal do cliente.
*   **Factory Pattern:** Usado na geração de documentos jurídicos (`legalService`), onde snapshots de dados são transformados em HTMLs renderizáveis (Confissões, Promissórias) e hashs de integridade.
*   **Optimistic UI:** A interface frequentemente assume o sucesso da operação (ex: ao marcar uma mensagem como lida ou arrastar um card no Kanban) antes da confirmação do servidor, melhorando a percepção de velocidade.

---

## 🔐 Segurança e Integridade

### Autenticação Híbrida
*   **Login Padrão:** E-mail e Senha via Supabase Auth.
*   **Login de Equipe:** Sistema customizado de PIN e CPF que realiza um "handshake" com o Supabase Auth via Edge Functions (`ensure_auth_user`), permitindo que operadores acessem sem e-mail direto, mas mantendo a segurança do RLS.

### Row Level Security (RLS)
O sistema depende estritamente das políticas RLS do PostgreSQL. O frontend nunca filtra dados por segurança; ele solicita os dados e o banco retorna apenas o que o usuário (`auth.uid()`) tem permissão para ver (seja dados próprios ou dados delegados por um supervisor).

### Integridade Jurídica (Blockchain-like)
O módulo `features/legal` implementa um sistema de prova de integridade:
1.  Os dados do contrato são serializados em um JSON Canônico.
2.  É gerado um hash **SHA-256** (Web Crypto API) desse snapshot.
3.  Esse hash é gravado no banco e impresso no documento PDF.
4.  Qualquer alteração futura nos dados do contrato invalida o hash, garantindo que o documento assinado corresponde exatamente aos dados daquele momento.

---

## 🤖 Inteligência Artificial (Gemini)

A integração com **Google Gemini** (`@google/genai`) não é apenas um chatbot. Ela atua como:
1.  **CRO (Chief Risk Officer):** Analisa a inadimplência da carteira e sugere ações de cobrança.
2.  **Interface de Voz:** O `useAIController` permite que o operador dite comandos ("Cadastrar cliente João...", "Registrar pagamento de 50 reais..."), que são interpretados pela IA e convertidos em ações de UI (abrir modais, preencher formulários).

---

## 🚀 Módulos Principais

### 💰 Financeiro (`features/loans` e `domain/finance`)
*   **Motor de Cálculo:** Suporta juros simples, compostos, multas fixas e mora diária.
*   **Ledger (Razão):** Todas as operações financeiras são imutáveis e registradas na tabela `transacoes`. O saldo atual é uma projeção (rebuild) desses eventos.
*   **Atomicidade:** Transações críticas (pagamentos, novos aportes) usam RPCs (Stored Procedures) no banco para garantir ACID (Atomicidade, Consistência, Isolamento, Durabilidade).

### 📞 Comunicação (`features/support`)
*   **Chat Realtime:** Suporte a texto, áudio (blob), imagens e localização.
*   **WebRTC:** Implementação manual de chamadas de voz e vídeo (`useSupportCalls.ts`) utilizando o Supabase como servidor de sinalização (signaling server).

### 🌐 Portal do Cliente
Um micro-app dentro do sistema. Acessível via tokens públicos (`?portal=UUID`), permite que o cliente final visualize seus débitos, baixe comprovantes e copie chaves PIX sem precisar de login e senha, aumentando a taxa de conversão de pagamentos.

---

## 🛠️ Stack Tecnológica Detalhada

| Tecnologia | Função |
| :--- | :--- |
| **React 19** | Biblioteca de UI (uso de novos hooks e patterns). |
| **TypeScript** | Tipagem estrita para garantir robustez financeira. |
| **Vite** | Build tool e dev server de alta performance. |
| **Supabase** | Backend-as-a-Service (Postgres, Auth, Realtime, Storage). |
| **Tailwind CSS** | Estilização utilitária. |
| **Recharts** | Visualização de dados (Gráficos financeiros). |
| **XLSX** | Manipulação de planilhas (Importação/Exportação). |
| **Lucide React** | Iconografia consistente. |
| **Google GenAI** | SDK para integração com modelos Gemini Pro/Flash. |

---

## ⚠️ Pontos de Atenção para Desenvolvedores

1.  **Roteamento Manual:** O sistema **não** usa React Router. A navegação é controlada pelo estado `activeTab` no `App.tsx`. Isso permite manter o estado da aplicação vivo (cache) ao trocar de abas, mas exige cuidado com o botão "Voltar" do navegador (gerenciado por `useExitGuard`).
2.  **Cache Local:** O hook `useAppState` implementa um cache agressivo no `localStorage` (`cm_cache_PROFILE_ID`) para funcionar offline-first. Alterações no schema do banco podem exigir limpeza desse cache.
3.  **Datas:** O sistema lida com datas em UTC (`utils/dateHelpers`). Cuidado ao usar `new Date()` sem tratamento de fuso horário, pois pode gerar erros de "vencimento ontem" dependendo da hora do dia.

---

*Documentação gerada automaticamente com base na análise estática do código-fonte v3.0.0.*
