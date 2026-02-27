# TESTE DE CONCORRÊNCIA — PAGAMENTO SIMULTÂNEO

## Objetivo
Validar que apenas 1 pagamento executa quando 2 requisições simultâneas tentam pagar a mesma parcela.

## Pré-requisitos
- 2 abas do navegador abertas
- Mesmo usuário logado em ambas
- Mesmo contrato/parcela visível em ambas
- Status da parcela: PENDING

## Passos

### 1. Preparação
1. Abrir aba 1: Dashboard do cliente/operador
2. Abrir aba 2: Mesmo dashboard (mesmo usuário)
3. Localizar parcela com status PENDING
4. Anotar ID da parcela: `<installment_id>`

### 2. Execução Simultânea
1. **Aba 1**: Clicar "Pagar" na parcela
2. **Aba 2**: Clicar "Pagar" na MESMA parcela (dentro de 1 segundo)
3. Aguardar resposta em ambas as abas

## Resultado Esperado

### Aba 1
- ✅ Pagamento processa com sucesso
- ✅ Parcela muda para status PAID
- ✅ Transações aparecem no ledger

### Aba 2
- ❌ Erro: "Parcela já quitada" OU "Transação já processada"
- ✅ Botão de pagamento desabilitado/oculto
- ✅ Página faz refresh automático e mostra status PAID

## Validação SQL

### Query 1: Verificar se parcela foi paga apenas 1 vez
```sql
SELECT COUNT(*) as transaction_count
FROM transacoes
WHERE installment_id = '<installment_id>'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
-- Esperado: 1 ou 2 (1 principal + 1 lucro, nunca 4 ou 6)
```

### Query 2: Verificar idempotência
```sql
SELECT idempotency_key, COUNT(*) as count
FROM transacoes
WHERE installment_id = '<installment_id>'
  AND created_at > NOW() - INTERVAL '5 minutes'
GROUP BY idempotency_key;
-- Esperado: 1 linha com count = 1 ou 2 (nunca duplicado)
```

### Query 3: Verificar status da parcela
```sql
SELECT id, status, paid_total, principal_remaining
FROM parcelas
WHERE id = '<installment_id>';
-- Esperado: status = PAID, paid_total > 0, principal_remaining = 0
```

## Cenários Adicionais

### Cenário A: Webhook + Frontend Simultâneos
1. Abrir aba 1: Portal de pagamento
2. Abrir aba 2: Dashboard do operador
3. Simular webhook MP (ou fazer pagamento real via PIX)
4. Operador tenta pagar a mesma parcela na aba 2
5. Resultado esperado: Apenas 1 pagamento executa

### Cenário B: Retry Automático
1. Fazer pagamento que falha (ex: timeout)
2. Frontend tenta novamente automaticamente
3. Resultado esperado: Idempotência bloqueia duplo pagamento

## Checklist Final

- [ ] Aba 1 paga com sucesso
- [ ] Aba 2 recebe erro apropriado
- [ ] Parcela muda para PAID em ambas as abas (após refresh)
- [ ] Transações registram apenas 1 pagamento
- [ ] Idempotency_key não duplica
- [ ] Ledger mostra principal + lucro corretos
- [ ] Contrato encerra se TODAS as parcelas PAID
- [ ] Sem erros no console do navegador
- [ ] Sem erros no log do Supabase
