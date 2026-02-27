-- DEPLOY BLINDADO — ÍNDICES E SCHEMA RELOAD
-- Executar no SQL Editor do Supabase Dashboard

-- 1. Criar índice para idempotência externa (CRÍTICO)
CREATE INDEX IF NOT EXISTS idx_transacoes_idempotency_key
ON transacoes(idempotency_key);

-- 2. Criar índice para payment_intents (busca rápida)
CREATE INDEX IF NOT EXISTS idx_payment_intents_profile_id
ON payment_intents(profile_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_loan_id
ON payment_intents(loan_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_status
ON payment_intents(status);

-- 3. Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';

-- INSTRUÇÕES:
-- 1. Copiar e executar este arquivo completo no SQL Editor do Supabase
-- 2. Aguardar 30-60 segundos para o schema recarregar
-- 3. Validar: Supabase Dashboard → API → Functions → process_payment_atomic_v2 deve aparecer
-- 4. Se erro "Could not find function in schema cache", aguardar mais tempo ou reiniciar projeto
