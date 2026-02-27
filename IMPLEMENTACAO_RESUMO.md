# Resumo de Implementação - Correção Definitiva de Pagamentos

## Objetivo
Eliminar erro de schema cache, unificar pagamento, corrigir ledger, impedir pagamento duplicado, encerrar contrato automaticamente e direcionar lucro corretamente para Caixa Livre.

## Arquivos Criados/Modificados

### 1. Banco de Dados (SQL)

#### `supabase/migrations/20260227_process_payment_atomic_v2.sql`
- **Nova RPC**: `process_payment_atomic_v2()`
- **Parâmetros**: 
  - `p_idempotency_key` (text) - Chave de idempotência para evitar duplicatas
  - `p_loan_id` (uuid) - ID do contrato
  - `p_installment_id` (uuid) - ID da parcela
  - `p_profile_id` (uuid) - ID do perfil (dono)
  - `p_operator_id` (uuid) - ID do operador
  - `p_principal_amount` (numeric) - Valor principal a pagar
  - `p_interest_amount` (numeric) - Valor de juros a pagar
  - `p_late_fee_amount` (numeric) - Valor de multa a pagar
  - `p_payment_date` (timestamptz) - Data do pagamento

- **Lógica**:
  1. Verifica idempotência (retorna se já foi processado)
  2. Faz LOCK na parcela para evitar race condition
  3. Bloqueia se parcela já está PAID
  4. Valida valor total > 0
  5. Atualiza parcela (paid_principal, paid_interest, paid_total, status)
  6. Cria transação de PRINCIPAL_RETURN (principal → fonte do contrato)
  7. Cria transação de LUCRO_EMPRESTIMO (juros + multa → Caixa Livre)
  8. Encerra contrato se TODAS as parcelas estão PAID

#### `supabase/migrations/20260227_drop_old_payment_function.sql`
- Remove função antiga `process_payment_atomic` (causa do schema cache)
- Executa `NOTIFY pgrst, 'reload schema'` para recarregar cache

### 2. Frontend (TypeScript/React)

#### `services/payments.service.ts` (REESCRITO)
- **Remoções**:
  - Fallback com `p_next_due_date`
  - Chamadas diretas a `from('loans')` e `from('installments')`
  - Uso de `as any`
  - Lógica de retry com parâmetros diferentes

- **Novo Fluxo**:
  1. Calcula deltas (late_fee → interest → principal)
  2. Chama RPC `process_payment_atomic_v2` UMA VEZ com todos os parâmetros
  3. Mantém RPC `process_lend_more_atomic` separada para LEND_MORE
  4. Trata erro de "Parcela já quitada" apropriadamente

#### `hooks/controllers/usePaymentController.ts` (MODIFICADO)
- Adicionado bloqueio de duplo clique com threshold de 2 segundos
- Verifica se `inst.status === 'PAID'` antes de permitir pagamento
- Mostra toast de erro se parcela já foi quitada

#### `features/portal/components/payment/PaymentViews.tsx` (MODIFICADO)
- Adicionadas props `isInstallmentPaid` e `isProcessing` ao BillingView
- Botão desabilitado enquanto `isProcessing === true`
- Botão substituído por "Parcela Quitada" quando `isInstallmentPaid === true`
- Loader visual durante processamento

#### `features/portal/components/PortalPaymentModal.tsx` (MODIFICADO)
- Adicionado state `isProcessing`
- Passa `isInstallmentPaid={installment.status === 'PAID'}` ao BillingView
- Passa `isProcessing={isProcessing}` ao BillingView

## Fluxo de Pagamento (Novo)

```
1. Frontend: Usuário clica "Pagar"
   ↓
2. usePaymentController: Verifica duplo clique + status PAID
   ↓
3. payments.service.ts: Calcula deltas (late_fee → interest → principal)
   ↓
4. RPC process_payment_atomic_v2: 
   - Lock parcela
   - Verifica se já PAID
   - Atualiza parcela (paid_*, principal_remaining, interest_remaining, status)
   - Cria transação PRINCIPAL_RETURN (→ fonte do contrato)
   - Cria transação LUCRO_EMPRESTIMO (→ Caixa Livre)
   - Encerra contrato se todas parcelas PAID
   ↓
5. Frontend: Refetch contrato, bloqueia botão se PAID
```

## Garantias de Segurança

### Idempotência
- Chave única `idempotency_key` em cada transação
- RPC verifica se já existe antes de processar
- Duplo clique é bloqueado no frontend (2s threshold)

### Atomicidade
- RPC executa em transação única (LANGUAGE plpgsql)
- LOCK na parcela evita race condition
- Validação de status PAID antes de qualquer alteração

### Ledger Correto
- Principal SEMPRE vai para `source_id` do contrato original
- Lucro (juros + multa) SEMPRE vai para Caixa Livre (28646e86-cec9-4d47-b600-3b771a066a05)
- Deltas registram exatamente o que foi pago em cada categoria

### Encerramento Automático
- RPC verifica se TODAS as parcelas estão PAID
- Se sim, contrato status muda para ENCERRADO
- Nenhuma ação manual necessária

## Passos de Implementação

1. **Executar Migrações SQL**:
   ```bash
   # No Supabase Console ou via CLI:
   supabase migration up
   ```

2. **Recarregar Schema**:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

3. **Build Frontend**:
   ```bash
   npm run build
   ```

4. **Deploy**:
   - Fazer push do código para produção
   - Verificar se RPC `process_payment_atomic_v2` aparece na API (Supabase Dashboard)

5. **Testar**:
   - Usar checklist em `TESTE_MANUAL_PAGAMENTOS.md`

## Possíveis Erros e Soluções

### "Could not find the function public.process_payment_atomic_v2 in the schema cache"
- **Causa**: Schema ainda não foi recarregado após DROP da função antiga
- **Solução**: Executar `NOTIFY pgrst, 'reload schema'` novamente

### "Parcela já quitada"
- **Causa**: Tentativa de pagar parcela com status PAID
- **Solução**: Frontend bloqueia botão, mas erro é tratado corretamente na RPC

### "Valor inválido"
- **Causa**: Soma de principal + interest + late_fee <= 0
- **Solução**: Validar no frontend antes de chamar RPC

### Ledger com valores errados
- **Causa**: Cálculo de deltas incorreto no frontend
- **Solução**: Verificar ordem de cálculo (late_fee → interest → principal)

## Próximas Melhorias (Fora do Escopo)

- [ ] Webhook do Mercado Pago para atualizar `process_payment_atomic_v2`
- [ ] Notificação em tempo real quando contrato é encerrado
- [ ] Relatório de lucro por período
- [ ] Integração com sistema de cobrança automática
