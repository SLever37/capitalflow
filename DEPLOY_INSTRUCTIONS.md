# Instruções de Deploy - CapitalFlow (Correção Definitiva de Pagamentos)

## 📦 Conteúdo do ZIP

Este arquivo contém o código-fonte completo do CapitalFlow com todas as correções implementadas para eliminar o erro de schema cache e unificar o processamento de pagamentos.

## 🚀 Passos de Deploy

### 1. Extrair o ZIP
```bash
unzip capitalflow-corrigido.zip -d capitalflow
cd capitalflow
```

### 2. Executar Migrações SQL (Banco de Dados)

**Opção A: Via Supabase CLI**
```bash
supabase migration up
```

**Opção B: Via Supabase Console**
1. Abra o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Copie e execute o conteúdo de `supabase/migrations/20260227_process_payment_atomic_v2.sql`
5. Copie e execute o conteúdo de `supabase/migrations/20260227_drop_old_payment_function.sql`

### 3. Recarregar Schema do PostgREST

Execute no SQL Editor do Supabase:
```sql
NOTIFY pgrst, 'reload schema';
```

Aguarde 30 segundos para o schema ser recarregado.

### 4. Instalar Dependências Frontend
```bash
npm install
# ou
pnpm install
```

### 5. Build do Frontend
```bash
npm run build
# ou
pnpm build
```

### 6. Deploy em Produção

**Se usar Vercel:**
```bash
npm install -g vercel
vercel deploy --prod
```

**Se usar outro host:**
- Fazer push para seu repositório Git
- Configurar CI/CD para fazer build e deploy automático

## 📋 Arquivos Modificados

| Arquivo | Tipo | Descrição |
| :--- | :--- | :--- |
| `supabase/migrations/20260227_process_payment_atomic_v2.sql` | Criado | Nova RPC com idempotência e ledger correto |
| `supabase/migrations/20260227_drop_old_payment_function.sql` | Criado | Remove função antiga que causava schema cache |
| `services/payments.service.ts` | Reescrito | Remove fallback, chama RPC v2 uma vez |
| `hooks/controllers/usePaymentController.ts` | Modificado | Bloqueio de duplo clique e verificação PAID |
| `features/portal/components/payment/PaymentViews.tsx` | Modificado | Bloqueia botão se parcela PAID |
| `features/portal/components/PortalPaymentModal.tsx` | Modificado | Passa props de status e loading |

## 🧪 Testes Pós-Deploy

Após fazer deploy, execute os testes em `TESTE_MANUAL_PAGAMENTOS.md`:

1. **Teste 1**: Pagamento Parcial
2. **Teste 2**: Pagamento Total (Quitação)
3. **Teste 3**: Bloqueio de Duplo Clique
4. **Teste 4**: Ledger Correto
5. **Teste 5**: Idempotência
6. **Teste 6**: Caixa Livre Recebe Lucro
7. **Teste 7**: Encerramento Automático
8. **Teste 8**: Erro de Parcela Já Paga
9. **Teste 9**: Validação de Valor
10. **Teste 10**: Integração Frontend-Backend

## 🔍 Verificação Pós-Deploy

### 1. Verificar se RPC foi criada
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'process_payment_atomic_v2';
```

### 2. Verificar se função antiga foi removida
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'process_payment_atomic';
```
(Deve retornar vazio)

### 3. Testar RPC manualmente
```sql
SELECT public.process_payment_atomic_v2(
  'test-idempotency-key-001',
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  100.00,
  25.00,
  5.00,
  NOW()
);
```

## ⚠️ Possíveis Erros e Soluções

### "Could not find the function public.process_payment_atomic_v2 in the schema cache"
**Solução**: Aguarde 30-60 segundos após executar `NOTIFY pgrst, 'reload schema'`. Se persistir, reinicie o projeto Supabase.

### "Parcela já quitada"
**Esperado**: Isso significa que a idempotência está funcionando corretamente. O frontend bloqueia o botão para parcelas PAID.

### Build falha com erros de TypeScript
**Solução**: Verificar se todas as dependências foram instaladas com `npm install` ou `pnpm install`.

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs do Supabase Dashboard
2. Consultar `IMPLEMENTACAO_RESUMO.md` para detalhes técnicos
3. Executar queries SQL em `TESTE_MANUAL_PAGAMENTOS.md` para validar dados

## ✅ Checklist de Deploy

- [ ] Migrações SQL executadas
- [ ] Schema recarregado (NOTIFY pgrst)
- [ ] Dependências instaladas (npm install)
- [ ] Build concluído (npm run build)
- [ ] Deploy realizado
- [ ] RPC `process_payment_atomic_v2` aparece na API
- [ ] Função antiga `process_payment_atomic` foi removida
- [ ] Testes manuais executados
- [ ] Pagamentos funcionando corretamente
- [ ] Ledger registrando transações corretamente
- [ ] Lucro indo para Caixa Livre
- [ ] Contratos encerrando automaticamente

## 🎉 Pronto para Produção

Quando todos os itens do checklist estiverem marcados, a implementação está pronta para uso em produção.
