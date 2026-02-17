# Relatório de Diagnóstico Técnico - CapitalFlow

**Data:** 14/02/2025
**Escopo:** Análise de Autenticação Híbrida e Bugs Potenciais (Sem alteração de código)

---

## 1. Diagnóstico Crítico: Por que o Login pode estar falhando?

Com base na análise estática do `src/features/auth/useAuth.ts` e do fluxo de dados, existem 3 pontos críticos de falha que impedem o login:

### A. Dependência de Senha em Texto Plano (Risco Alto)
O fluxo atual exige que a RPC do banco de dados (`resolve_profile_login`) retorne a senha do usuário em formato utilizável (`auth_password`).
*   **O Problema:** Se a sua RPC no banco estiver retornando `null` ou um *hash* (como bcrypt/argon2) no campo `auth_password`, o frontend **não consegue** autenticar no Supabase Auth (`signInWithPassword`), pois este exige a senha original ("crua").
*   **Sintoma:** O erro retornado será "Usuário ou senha inválidos" vindo do `ensureAuthSession`, mesmo que a RPC tenha validado o usuário corretamente.

### B. Falha na Edge Function (`ensure_auth_user`)
O código faz uma chamada obrigatória para `supabase.functions.invoke('ensure_auth_user')`.
*   **O Problema:** Se esta função não estiver implantada (deploy), estiver com variáveis de ambiente (`SUPABASE_SERVICE_ROLE_KEY`) incorretas ou falhar por timeout, o login é abortado imediatamente.
*   **Sintoma:** O app exibe "Serviço de autenticação indisponível no momento".

### C. Dessincronia do `user_id` (Vínculo RLS)
Após o login no Auth, o sistema busca o perfil usando: `.eq('user_id', uid)`.
*   **O Problema:** Se a Edge Function criar o usuário no Auth mas **falhar** ao atualizar a coluna `user_id` na tabela `perfis` do seu banco PostgreSQL, o login técnico ocorre, mas o carregamento de dados falha.
*   **Sintoma:** Login parece passar, mas cai na tela de erro "Perfil de acesso não localizado (vínculo user_id pendente)".

---

## 2. Análise do Fluxo Híbrido Implementado

O código atual em `useAuth.ts` implementa um padrão de **Autenticação Híbrida Just-in-Time**. O objetivo é permitir que usuários cadastrados apenas na tabela `perfis` (legado/sistema antigo) consigam entrar e ganhar um usuário Supabase Auth automaticamente.

**O Fluxo Lógico Atual é:**

1.  **Validação de Negócio (RPC):** O frontend envia as credenciais para o banco (`resolve_profile_login`). O banco valida se o perfil existe e se a senha (ou PIN) está correta na tabela `perfis`.
2.  **Provisionamento (Edge Function):** Se o banco aprovar, o frontend chama a Edge Function. Esta função atua como "Admin" para:
    *   Criar o usuário no Supabase Auth (se não existir).
    *   Atualizar a senha no Supabase Auth (se já existir, para garantir sincronia).
    *   **Crucial:** Escrever o `id` do Supabase Auth de volta na tabela `perfis`.
3.  **Sessão Cliente (Client SDK):** O frontend usa as credenciais retornadas/validadas para iniciar uma sessão oficial (`ensureAuthSession`). Isso gera o Token JWT necessário para passar pelas políticas de segurança (RLS).

**Conclusão:** A estratégia está correta arquiteturalmente para migração de sistemas legados, mas é frágil se a RPC não retornar a senha "crua" para o passo 3.

---

## 3. Outros Bugs e Pontos de Atenção Identificados

### 🚩 Fuso Horário e Datas (`features/loans/hooks/useLoanForm.ts`)
*   **Análise:** O formulário usa `new Date().toISOString().split('T')[0]` para definir datas padrão.
*   **Risco:** Isso gera datas em UTC. Se o usuário estiver no Brasil (GMT-3) e abrir o sistema às 22h, a data sugerida será a de "amanhã". Ao salvar no banco como `date` (YYYY-MM-DD), o contrato pode ficar com a data errada.

### 🚩 Risco de Race Condition no Login (`useAuth.ts`)
*   **Análise:** A função `ensureAuthSession` faz `signOut` se já houver uma sessão.
*   **Risco:** Se o `signOut` demorar alguns milissegundos a mais que o esperado, o subsequente `signInWithPassword` pode falhar ou o estado do React pode não atualizar a tempo, exigindo que o usuário clique em "Entrar" duas vezes.

### 🚩 Tipagem de `any` em Serviços Críticos (`services/adapters/dbAdapters.ts`)
*   **Análise:** O uso excessivo de `any` nos adaptadores de banco de dados esconde erros de estrutura.
*   **Risco:** Se o nome de uma coluna no banco mudar (ex: de `valor_parcela` para `valor`), o TypeScript não avisará, e o sistema quebrará silenciosamente exibindo `NaN` ou `undefined` nos valores financeiros.

### 🚩 Dependência de `localStorage` para Cache (`hooks/useAppState.ts`)
*   **Análise:** O sistema faz cache agressivo em `localStorage`.
*   **Risco:** Se a estrutura do objeto `UserProfile` mudar no código, o app pode quebrar ao tentar ler um cache antigo salvo no navegador do cliente (JSON parse error ou campos faltantes). *Recomendação: Implementar versionamento da chave de cache.*

---

## 4. Recomendações para Correção (Checklist)

Para corrigir o problema de login sem alterar a lógica do frontend:

1.  **Verifique a RPC `resolve_profile_login`:** Ela **DEVE** retornar a senha em texto plano no campo `auth_password`. Se ela retornar hash, o fluxo híbrido atual falhará.
2.  **Verifique a Edge Function:** Confirme se a função `ensure_auth_user` está implantada e se a variável `SUPABASE_SERVICE_ROLE_KEY` está configurada corretamente no painel do Supabase.
3.  **Política RLS:** Garanta que a tabela `perfis` permite `UPDATE` pela Service Role (usada na Edge Function) para preencher a coluna `user_id`.
