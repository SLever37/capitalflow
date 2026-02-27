# TAREFA 2: INTENÇÃO DE PAGAMENTO — ENTREGA COMPLETA

## 2.1 Análise do Mismatch de Tabelas

**Fato Concreto**: 
- Portal grava intenção em `payment_intents` (via RPC `portal_submit_payment_intent`)
- Operador lê de `sinalizacoes_pagamento` (via adapter `dbAdapters.ts` linha 48)
- **Resultado**: Intenção criada, mas não aparece no operador

**Busca no Código**:
- `payment_intents`: Nenhuma referência em `services/` (não é lida pelo operador)
- `sinalizacoes_pagamento`: Referenciada em `dbAdapters.ts:48` e `loanAdapter.ts:176` (usada pelo operador)

**Decisão**: **OPÇÃO A (PREFERIDA)** - Operador passa a ler `payment_intents` como fonte da verdade

---

## 2.2 Solução: Unificar para `payment_intents`

### Passo 1: Criar Tabela `payment_intents` (se não existir)

**SQL**:
```sql
CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('PAGAR_PIX', 'SOLICITAR_LINK')),
  status text NOT NULL CHECK (status IN ('PENDENTE', 'APROVADO', 'RECUSADO')) DEFAULT 'PENDENTE',
  proof_url text,
  amount numeric(12, 2),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES perfis(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_intents_profile_id ON payment_intents(profile_id);
CREATE INDEX idx_payment_intents_loan_id ON payment_intents(loan_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
```

### Passo 2: Atualizar `dbAdapters.ts` para ler `payment_intents`

**Arquivo**: `services/adapters/dbAdapters.ts`

**DIFF**:
```diff
--- a/services/adapters/dbAdapters.ts (ANTES)
+++ b/services/adapters/dbAdapters.ts (DEPOIS)

@@ -45,7 +45,7 @@
 export const mapLoanFromDB = (l: any, clientsData: any[] = []): Loan => {
     const rawParcelas = asArray(l.parcelas);
     const rawTransacoes = asArray(l.transacoes);
-    const rawSinais = asArray(l.sinalizacoes_pagamento);
+    const rawSinais = asArray(l.payment_intents);
 
     const installments = rawParcelas.map((p: any) => ({
         id: asString(p.id),
```

**Motivo**: Linha 48 - Trocar fonte de dados de `sinalizacoes_pagamento` para `payment_intents`

### Passo 3: Atualizar Query de Carregamento de Contratos

**Arquivo**: `services/contracts.service.ts` (ou onde carrega contratos com intenções)

**Buscar**: Qualquer `.select()` que inclua `sinalizacoes_pagamento`

**DIFF**:
```diff
--- a/services/contracts.service.ts (ANTES)
+++ b/services/contracts.service.ts (DEPOIS)

@@ -XX,7 +XX,7 @@
   const { data, error } = await supabase
     .from('contratos')
-    .select('*, parcelas(*), transacoes(*), sinalizacoes_pagamento(*)')
+    .select('*, parcelas(*), transacoes(*), payment_intents(*)')
     .eq('profile_id', profileId)
     .eq('is_archived', false);
```

**Motivo**: Incluir `payment_intents` em vez de `sinalizacoes_pagamento` na query

### Passo 4: Atualizar RLS Policies

**SQL**:
```sql
-- RLS para payment_intents
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

-- Operador vê intenções dos seus contratos
CREATE POLICY "Operador vê payment_intents" ON payment_intents
  FOR SELECT
  USING (
    profile_id = auth.uid() 
    OR profile_id IN (
      SELECT id FROM perfis WHERE supervisor_id = auth.uid()
    )
  );

-- Operador aprova/recusa
CREATE POLICY "Operador aprova payment_intents" ON payment_intents
  FOR UPDATE
  USING (
    profile_id = auth.uid() 
    OR profile_id IN (
      SELECT id FROM perfis WHERE supervisor_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id = auth.uid() 
    OR profile_id IN (
      SELECT id FROM perfis WHERE supervisor_id = auth.uid()
    )
  );

-- Cliente cria intenção
CREATE POLICY "Cliente cria payment_intents" ON payment_intents
  FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
  );
```

### Passo 5: Atualizar Realtime Subscription

**Arquivo**: Qualquer hook que monitora intenções (ex.: `useAppNotifications.ts`)

**DIFF**:
```diff
--- a/hooks/useAppNotifications.ts (ANTES)
+++ b/hooks/useAppNotifications.ts (DEPOIS)

@@ -XX,7 +XX,7 @@
     const channel = supabase.channel('global-urgent-alerts')
       .on(
         'postgres_changes',
-        { event: 'INSERT', schema: 'public', table: 'sinalizacoes_pagamento', filter: `profile_id=eq.${activeUser.id}` },
+        { event: 'INSERT', schema: 'public', table: 'payment_intents', filter: `profile_id=eq.${activeUser.id}` },
         (payload) => {
           const newSignal = payload.new;
           if (newSignal.status === 'PENDENTE') {
```

**Motivo**: Monitorar `payment_intents` em vez de `sinalizacoes_pagamento`

---

## 2.3 Critério de Aceite

### Teste 1: Cliente Cria Intenção

**Passos**:
1. Cliente acessa portal com link válido
2. Clica "Informar Pagamento Realizado"
3. Intenção é gravada

**SQL - Validação**:
```sql
SELECT id, profile_id, loan_id, status, created_at
FROM payment_intents
WHERE loan_id = '<loan_id>'
ORDER BY created_at DESC
LIMIT 1;
-- Esperado: status = PENDENTE, created_at = NOW()
```

### Teste 2: Operador Vê Intenção

**Passos**:
1. Operador abre dashboard
2. Faz refresh ou aguarda realtime
3. Intenção aparece na lista de pendências

**SQL - Validação**:
```sql
SELECT COUNT(*) as count
FROM payment_intents
WHERE profile_id = '<operator_id>'
  AND status = 'PENDENTE';
-- Esperado: count >= 1
```

### Teste 3: Operador Aprova/Recusa

**Passos**:
1. Operador clica "Aprovar" ou "Recusar"
2. Status atualiza
3. Intenção sai da fila pendente

**SQL - Validação**:
```sql
SELECT id, status, reviewed_at, reviewed_by
FROM payment_intents
WHERE id = '<intent_id>';
-- Esperado: status = APROVADO/RECUSADO, reviewed_at = NOW(), reviewed_by = <operator_id>
```

### Teste 4: Realtime Atualiza Badge

**Passos**:
1. Operador tem dashboard aberto
2. Cliente cria intenção
3. Badge de notificação atualiza em tempo real (sem refresh)

**Validação**: Visual - badge deve incrementar sem refresh manual

---

## ARQUIVOS ALTERADOS

| Arquivo | Tipo | Mudança |
| :--- | :--- | :--- |
| `services/adapters/dbAdapters.ts` | Modificado | Linha 48: `sinalizacoes_pagamento` → `payment_intents` |
| `services/contracts.service.ts` | Modificado | Query: incluir `payment_intents` em vez de `sinalizacoes_pagamento` |
| `hooks/useAppNotifications.ts` | Modificado | Subscription: monitorar `payment_intents` |
| Qualquer outro hook com realtime | Modificado | Trocar tabela de origem |

---

## SQL SEPARADO (EXECUTAR NO SUPABASE)

### 1. Criar Tabela `payment_intents`
```sql
CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('PAGAR_PIX', 'SOLICITAR_LINK')),
  status text NOT NULL CHECK (status IN ('PENDENTE', 'APROVADO', 'RECUSADO')) DEFAULT 'PENDENTE',
  proof_url text,
  amount numeric(12, 2),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES perfis(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_intents_profile_id ON payment_intents(profile_id);
CREATE INDEX idx_payment_intents_loan_id ON payment_intents(loan_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
```

### 2. Habilitar RLS
```sql
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

-- Operador vê payment_intents
CREATE POLICY "Operador vê payment_intents" ON payment_intents
  FOR SELECT
  USING (
    profile_id = auth.uid() 
    OR profile_id IN (
      SELECT id FROM perfis WHERE supervisor_id = auth.uid()
    )
  );

-- Operador aprova/recusa
CREATE POLICY "Operador aprova payment_intents" ON payment_intents
  FOR UPDATE
  USING (
    profile_id = auth.uid() 
    OR profile_id IN (
      SELECT id FROM perfis WHERE supervisor_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id = auth.uid() 
    OR profile_id IN (
      SELECT id FROM perfis WHERE supervisor_id = auth.uid()
    )
  );

-- Cliente cria payment_intents
CREATE POLICY "Cliente cria payment_intents" ON payment_intents
  FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
  );
```

### 3. Migrar Dados (Opcional)
```sql
-- Se houver dados em sinalizacoes_pagamento, copiar para payment_intents
INSERT INTO payment_intents (profile_id, loan_id, client_id, type, status, proof_url, review_note, reviewed_at, reviewed_by, created_at)
SELECT profile_id, loan_id, client_id, tipo_intencao, status, comprovante_url, review_note, reviewed_at, reviewed_by, created_at
FROM sinalizacoes_pagamento
ON CONFLICT DO NOTHING;
```

---

## PRÓXIMA TAREFA

→ **TAREFA 3**: Chat/Notificações (persistência, realtime, notificação)
