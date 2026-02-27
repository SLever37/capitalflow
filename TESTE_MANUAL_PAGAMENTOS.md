# Teste Manual - Correção de Pagamentos (CapitalFlow)

## Pré-Requisitos
1. Executar as migrações SQL:
   - `supabase/migrations/20260227_process_payment_atomic_v2.sql` (criar RPC v2)
   - `supabase/migrations/20260227_drop_old_payment_function.sql` (remover função antiga)
2. Recarregar o schema do PostgREST (NOTIFY pgrst, 'reload schema')
3. Fazer build do frontend: `npm run build`

## Teste 1: Pagamento Parcial
**Objetivo**: Verificar se parcela fica PARTIAL, ledger registra 2 transações (principal + lucro), e principal vai para fonte do contrato.

**Passos**:
1. Abrir contrato com parcela pendente (status = PENDING)
2. Clicar em "Pagar Parcialmente"
3. Inserir valor menor que o total devido (ex: 50% do valor)
4. Confirmar pagamento
5. **Verificações**:
   - [ ] Parcela status muda para PARTIAL
   - [ ] Transações criadas: 2 registros (um com category='PRINCIPAL_RETURN', outro com category='LUCRO_EMPRESTIMO')
   - [ ] Principal retorna para source_id da parcela original
   - [ ] Lucro (juros) vai para Caixa Livre (source_id = 28646e86-cec9-4d47-b600-3b771a066a05)
   - [ ] Botão de pagamento continua ativo (permite novo pagamento)

## Teste 2: Pagamento Total (Quitação)
**Objetivo**: Verificar se parcela fica PAID, contrato encerra automaticamente, e UI bloqueia novo pagamento.

**Passos**:
1. Abrir contrato com parcela em status PARTIAL (do teste anterior)
2. Clicar em "Pagar Restante" ou "Quitação Total"
3. Confirmar pagamento do valor total
4. **Verificações**:
   - [ ] Parcela status muda para PAID
   - [ ] Contrato status muda para ENCERRADO
   - [ ] Transações criadas: 2 registros (principal + lucro)
   - [ ] Botão de pagamento desaparece ou fica desabilitado
   - [ ] Mensagem "Parcela Quitada" aparece no lugar do botão

## Teste 3: Bloqueio de Duplo Clique
**Objetivo**: Verificar se tentativa de pagar novamente é bloqueada.

**Passos**:
1. Abrir contrato com parcela PAID
2. Tentar clicar no botão de pagamento (se visível)
3. **Verificações**:
   - [ ] Botão está desabilitado ou não renderizado
   - [ ] Mensagem de erro "Parcela já quitada" aparece se tentar via API
   - [ ] RPC retorna erro "Parcela já quitada"

## Teste 4: Ledger Correto
**Objetivo**: Verificar se ledger registra valores corretos com deltas.

**Passos**:
1. Executar pagamento parcial de R$ 100 (ex: R$ 50 principal + R$ 30 juros + R$ 20 multa)
2. Verificar tabela `transacoes`:
   ```sql
   SELECT * FROM transacoes 
   WHERE idempotency_key LIKE '%<idempotency_key>%'
   ORDER BY created_at;
   ```
3. **Verificações**:
   - [ ] Registro 1: principal_delta=50, interest_delta=0, late_fee_delta=0, category='PRINCIPAL_RETURN'
   - [ ] Registro 2: principal_delta=0, interest_delta=30, late_fee_delta=20, category='LUCRO_EMPRESTIMO'
   - [ ] Ambos têm idempotency_key preenchido
   - [ ] source_id do registro 1 = source_id do contrato
   - [ ] source_id do registro 2 = 28646e86-cec9-4d47-b600-3b771a066a05 (Caixa Livre)

## Teste 5: Idempotência
**Objetivo**: Verificar se chamada duplicada não cria registros duplicados.

**Passos**:
1. Anotar o idempotency_key de um pagamento bem-sucedido
2. Chamar a RPC novamente com o mesmo idempotency_key
3. **Verificações**:
   - [ ] Segunda chamada retorna sem erro (RETURN no início da função)
   - [ ] Nenhum novo registro criado em transacoes
   - [ ] Parcela não é alterada novamente

## Teste 6: Caixa Livre Recebe Lucro
**Objetivo**: Verificar se lucro sempre vai para Caixa Livre, independentemente da fonte do contrato.

**Passos**:
1. Criar contrato com source_id = "fonte_x" (qualquer fonte)
2. Pagar parcela com juros
3. Verificar transacoes:
   ```sql
   SELECT source_id, principal_delta, interest_delta, late_fee_delta 
   FROM transacoes 
   WHERE loan_id = '<loan_id>' 
   AND category IN ('PRINCIPAL_RETURN', 'LUCRO_EMPRESTIMO');
   ```
4. **Verificações**:
   - [ ] Registro com principal_delta > 0 tem source_id = "fonte_x"
   - [ ] Registro com interest_delta > 0 tem source_id = 28646e86-cec9-4d47-b600-3b771a066a05
   - [ ] Lucro NUNCA vai para a fonte do contrato

## Teste 7: Encerramento Automático
**Objetivo**: Verificar se contrato encerra quando TODAS as parcelas estão PAID.

**Passos**:
1. Criar contrato com 3 parcelas
2. Pagar 2 parcelas completamente (status = PAID)
3. Contrato ainda deve estar ATIVO
4. Pagar a 3ª parcela completamente
5. **Verificações**:
   - [ ] Contrato status muda para ENCERRADO
   - [ ] Todas as 3 parcelas têm status = PAID
   - [ ] Nenhuma parcela com status PENDING ou PARTIAL

## Teste 8: Erro de Parcela Já Paga
**Objetivo**: Verificar se RPC bloqueia pagamento de parcela já quitada.

**Passos**:
1. Pagar parcela completamente (status = PAID)
2. Tentar pagar novamente (mesmo que com valor menor)
3. **Verificações**:
   - [ ] Erro retornado: "Parcela já quitada"
   - [ ] Nenhuma alteração na parcela
   - [ ] Nenhum novo registro em transacoes

## Teste 9: Validação de Valor
**Objetivo**: Verificar se RPC rejeita valores inválidos.

**Passos**:
1. Chamar RPC com p_principal_amount=0, p_interest_amount=0, p_late_fee_amount=0
2. **Verificações**:
   - [ ] Erro retornado: "Valor inválido"
   - [ ] Nenhuma alteração no banco

## Teste 10: Integração Frontend-Backend
**Objetivo**: Verificar fluxo completo do portal do cliente.

**Passos**:
1. Cliente acessa portal com link válido
2. Clica em "Pagar" para parcela PENDING
3. Modal abre mostrando valor e chave PIX
4. Cliente clica "Informar Pagamento Realizado"
5. **Verificações**:
   - [ ] Intenção de pagamento registrada em payment_intents (ou sinalizacoes_pagamento)
   - [ ] Operador recebe notificação
   - [ ] Modal mostra "Aviso Enviado!"
6. Cliente retorna e tenta pagar novamente
7. **Verificações**:
   - [ ] Botão está desabilitado ou mostra "Parcela Quitada"
   - [ ] Nenhuma nova intenção criada

---

## Queries SQL de Validação

### Verificar parcela após pagamento
```sql
SELECT id, status, paid_principal, paid_interest, paid_total, principal_remaining, interest_remaining
FROM parcelas
WHERE id = '<installment_id>';
```

### Verificar contrato após quitação
```sql
SELECT id, status
FROM contratos
WHERE id = '<loan_id>';
```

### Verificar ledger completo
```sql
SELECT 
  id, 
  idempotency_key, 
  amount, 
  principal_delta, 
  interest_delta, 
  late_fee_delta, 
  source_id, 
  category, 
  created_at
FROM transacoes
WHERE loan_id = '<loan_id>'
ORDER BY created_at DESC;
```

### Verificar Caixa Livre
```sql
SELECT 
  SUM(amount) as total_lucro,
  COUNT(*) as num_transacoes
FROM transacoes
WHERE source_id = '28646e86-cec9-4d47-b600-3b771a066a05'
AND category = 'LUCRO_EMPRESTIMO';
```

### Verificar idempotência
```sql
SELECT idempotency_key, COUNT(*) as count
FROM transacoes
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING COUNT(*) > 1;
```

---

## Status de Conclusão

- [ ] Teste 1: Pagamento Parcial
- [ ] Teste 2: Pagamento Total
- [ ] Teste 3: Bloqueio de Duplo Clique
- [ ] Teste 4: Ledger Correto
- [ ] Teste 5: Idempotência
- [ ] Teste 6: Caixa Livre Recebe Lucro
- [ ] Teste 7: Encerramento Automático
- [ ] Teste 8: Erro de Parcela Já Paga
- [ ] Teste 9: Validação de Valor
- [ ] Teste 10: Integração Frontend-Backend

**Todos os testes passaram**: [ ]
