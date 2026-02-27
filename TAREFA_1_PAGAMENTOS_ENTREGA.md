# TAREFA 1: PAGAMENTOS — ENTREGA COMPLETA

## 1.1 RPC Oficial Única

**Status**: ✅ DEFINIDA  
**RPC Final**: `process_payment_atomic_v2`  
**Localização**: `supabase/migrations/20260227_process_payment_atomic_v2.sql`

**Assinatura**:
```sql
process_payment_atomic_v2(
  p_idempotency_key text,
  p_loan_id uuid,
  p_installment_id uuid,
  p_profile_id uuid,
  p_operator_id uuid,
  p_principal_amount numeric,
  p_interest_amount numeric,
  p_late_fee_amount numeric,
  p_payment_date timestamptz
)
```

**Ação**: Remover overload antigo `process_payment_atomic` via:
```sql
DROP FUNCTION IF EXISTS public.process_payment_atomic CASCADE;
NOTIFY pgrst, 'reload schema';
```

---

## 1.2 Webhook MP Corrigido

**Arquivo**: `supabase/functions/mp-webhook/index.ts`

### DIFF - Substituição de RPC e Cálculo de Deltas

```diff
--- a/supabase/functions/mp-webhook/index.ts (ANTES)
+++ b/supabase/functions/mp-webhook/index.ts (DEPOIS)

@@ -133,19 +133,33 @@
       const paymentType = metadata.payment_type || "RENEW_INTEREST";
       const profileId = metadata.profile_id || loan.profile_id;
       const sourceId = metadata.source_id || loan.source_id;
 
-      // IMPORTANTE: cálculo de modalidade deve ser centralizado na RPC no banco
-      // para remover hardcode de +30 dias e garantir consistência.
+      // Cálculo de deltas para a RPC v2 (late_fee → interest → principal)
+      const principalDue = Number(inst.principal_remaining) || 0;
+      const interestDue = Number(inst.interest_remaining) || 0;
+      const lateFeeDue = Number(inst.late_fee_accrued) || 0;
+
+      let remaining = amountPaid;
+      const lateFeeDelta = Math.max(0, Math.min(remaining, lateFeeDue));
+      remaining -= lateFeeDelta;
+      const interestDelta = Math.max(0, Math.min(remaining, interestDue));
+      remaining -= interestDelta;
+      const principalDelta = Math.max(0, Math.min(remaining, principalDue));
+
       const rpcParams: any = {
         p_idempotency_key: String(paymentId),
         p_loan_id: loan.id,
         p_installment_id: inst.id,
         p_profile_id: profileId,
         p_operator_id: profileId,
-        p_source_id: sourceId,
-        p_amount_to_pay: amountPaid,
-        p_notes: `Pagamento via PIX Portal (${paymentType === "FULL" ? "Quitação" : "Renovação"})`,
-        p_category: "RECEITA",
-        p_payment_type: paymentType === "FULL" ? "PAYMENT_FULL" : "PAYMENT_PARTIAL",
+        p_principal_amount: principalDelta,
+        p_interest_amount: interestDelta,
+        p_late_fee_amount: lateFeeDelta,
+        p_payment_date: new Date().toISOString(),
       };
 
-      const { error: rpcError } = await supabase.rpc("process_payment_atomic", rpcParams);
+      const { error: rpcError } = await supabase.rpc("process_payment_atomic_v2", rpcParams);
       if (rpcError) {
         console.error("[mp-webhook] rpc error:", rpcError);
-        return json({ ok: false, error: "Auto-process failed: " + rpcError.message }, 500);
+        // Não falhar se parcela já foi paga (idempotência)
+        if (!String(rpcError.message).includes("Parcela já quitada")) {
+          return json({ ok: false, error: "Auto-process failed: " + rpcError.message }, 500);
+        }
       }
```

**Motivo**: 
- Linha 151: Trocar `process_payment_atomic` (antiga) por `process_payment_atomic_v2` (oficial)
- Linhas 135-145: Calcular deltas (late_fee → interest → principal) antes de chamar RPC
- Linhas 147-157: Passar apenas parâmetros esperados pela RPC v2
- Linhas 160-166: Tratar erro de idempotência sem falhar (parcela já paga)

---

## 1.3 Quitação/Encerramento

**Implementado em**: `supabase/migrations/20260227_process_payment_atomic_v2.sql` (linhas 140-154)

**Lógica**:
```sql
-- ENCERRAR CONTRATO SE TODAS PARCELAS ESTIVEREM PAID
SELECT COUNT(*) INTO v_remaining_count
FROM parcelas
WHERE loan_id = p_loan_id
  AND status <> 'PAID';

IF v_remaining_count = 0 THEN
  UPDATE contratos
  SET status = 'ENCERRADO'
  WHERE id = p_loan_id;
END IF;
```

**Bloqueio no Frontend**:
- `services/payments.service.ts`: Verifica `inst.status === 'PAID'` antes de permitir pagamento
- `hooks/controllers/usePaymentController.ts`: Bloqueia duplo clique com threshold de 2s
- `features/portal/components/payment/PaymentViews.tsx`: Desabilita botão se `isInstallmentPaid === true`

---

## 1.4 Ledger Correto (Lucro no Caixa Livre)

**Implementado em**: `supabase/migrations/20260227_process_payment_atomic_v2.sql` (linhas 78-138)

**Regra Obrigatória**:
```sql
-- LEDGER PRINCIPAL: Retorna para a fonte do empréstimo
INSERT INTO transacoes (...)
SELECT ... FROM contratos e WHERE e.id = p_loan_id AND p_principal_amount > 0;

-- LEDGER LUCRO: Vai sempre para Caixa Livre
IF (p_interest_amount + p_late_fee_amount) > 0 THEN
  INSERT INTO transacoes (...)
  VALUES (
    ...,
    source_id = v_caixa_livre,  -- 28646e86-cec9-4d47-b600-3b771a066a05
    principal_delta = 0,
    interest_delta = p_interest_amount,
    late_fee_delta = p_late_fee_amount,
    category = 'LUCRO_EMPRESTIMO',
    ...
  );
END IF;
```

**Garantia**: 
- Principal SEMPRE vai para `source_id` do contrato original
- Lucro (juros + multa) SEMPRE vai para Caixa Livre
- Deltas registram exatamente o que foi pago

---

## 1.5 Schema Cache Resolvido

**Passo Obrigatório** (executar após DROP da função antiga):

```sql
NOTIFY pgrst, 'reload schema';
```

**Onde**: SQL Editor do Supabase Dashboard

**Tempo**: Aguardar 30-60 segundos para recarregar

**Validação**: Verificar se `process_payment_atomic_v2` aparece na API (Supabase Dashboard → API → Functions)

---

## CHECKLIST DE TESTE

### Teste 1: Pagamento Parcial (Webhook MP)

**SQL - Antes**:
```sql
SELECT id, status, principal_remaining, interest_remaining, late_fee_accrued, paid_total
FROM parcelas
WHERE id = '<installment_id>';
```

**Passos**:
1. Simular webhook MP com `payment.status = 'approved'`
2. Verificar se RPC `process_payment_atomic_v2` foi chamada
3. Verificar se deltas foram calculados corretamente

**SQL - Depois**:
```sql
SELECT id, status, paid_principal, paid_interest, paid_total, principal_remaining, interest_remaining
FROM parcelas
WHERE id = '<installment_id>';
-- Esperado: status = PARTIAL, paid_* > 0, remaining < original
```

**SQL - Transações**:
```sql
SELECT id, category, source_id, principal_delta, interest_delta, late_fee_delta, created_at
FROM transacoes
WHERE installment_id = '<installment_id>'
ORDER BY created_at DESC
LIMIT 2;
-- Esperado: 2 registros (PRINCIPAL_RETURN + LUCRO_EMPRESTIMO)
```

---

### Teste 2: Pagamento Total (Quitação)

**Passos**:
1. Pagar parcela completamente (status = PAID)
2. Verificar se contrato foi encerrado

**SQL - Parcela**:
```sql
SELECT id, status, paid_total, principal_remaining, interest_remaining
FROM parcelas
WHERE id = '<installment_id>';
-- Esperado: status = PAID, remaining = 0
```

**SQL - Contrato**:
```sql
SELECT id, status
FROM contratos
WHERE id = '<loan_id>';
-- Esperado: status = ENCERRADO (se TODAS as parcelas PAID)
```

---

### Teste 3: Bloqueio de Duplo Pagamento

**Passos**:
1. Tentar pagar novamente a mesma parcela (status = PAID)
2. Verificar se RPC retorna erro "Parcela já quitada"

**SQL - Validação**:
```sql
SELECT COUNT(*) as count
FROM transacoes
WHERE idempotency_key = '<idempotency_key>';
-- Esperado: 1 ou 2 (nunca duplicado)
```

**Erro Esperado**:
```
"Parcela já quitada"
```

---

## ARQUIVOS ALTERADOS

| Arquivo | Tipo | Mudança |
| :--- | :--- | :--- |
| `supabase/migrations/20260227_process_payment_atomic_v2.sql` | Criado | RPC v2 com idempotência, lock, validações, ledger |
| `supabase/migrations/20260227_drop_old_payment_function.sql` | Criado | Remove função antiga, recarrega schema |
| `supabase/functions/mp-webhook/index.ts` | Modificado | Chamada RPC v2, cálculo de deltas, tratamento de erro |
| `services/payments.service.ts` | Modificado | Chama RPC v2, remove fallback |
| `hooks/controllers/usePaymentController.ts` | Modificado | Bloqueio duplo clique, verificação PAID |
| `features/portal/components/payment/PaymentViews.tsx` | Modificado | Botão desabilitado se PAID |
| `features/portal/components/PortalPaymentModal.tsx` | Modificado | Passa props de status |

---

## SQL SEPARADO (EXECUTAR NO SUPABASE)

### 1. Criar RPC v2
Arquivo: `supabase/migrations/20260227_process_payment_atomic_v2.sql`
(Já incluído no ZIP)

### 2. Remover Função Antiga
Arquivo: `supabase/migrations/20260227_drop_old_payment_function.sql`
(Já incluído no ZIP)

### 3. Recarregar Schema
```sql
NOTIFY pgrst, 'reload schema';
```

---

## PRÓXIMA TAREFA

→ **TAREFA 2**: Intenção de Pagamento (portal → operador)
