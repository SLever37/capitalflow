-- VIEW: EXTRATO GERAL CONSOLIDADO
-- Unifica transacoes (crédito) + pf_transacoes (finanças)

CREATE OR REPLACE VIEW vw_extrato_geral AS
SELECT
  -- Crédito (transacoes)
  t.id,
  'CREDITO' as kind,
  t.source_id,
  t.amount,
  COALESCE(t.category, 'RECEITA') as category,
  COALESCE(t.notes, 'Transacao de credito') as description,
  t.created_at,
  jsonb_build_object(
    'principal_delta', t.principal_delta,
    'interest_delta', t.interest_delta,
    'late_fee_delta', t.late_fee_delta,
    'loan_id', t.loan_id,
    'installment_id', t.installment_id,
    'payment_type', t.payment_type,
    'idempotency_key', t.idempotency_key
  ) as meta,
  t.profile_id,
  t.loan_id
FROM transacoes t

UNION ALL

SELECT
  -- Finanças (pf_transacoes)
  pf.id,
  'FINANCEIRO' as kind,
  pf.account_id as source_id,
  pf.amount,
  COALESCE(pf.category, 'DESPESA') as category,
  COALESCE(pf.description, 'Transacao financeira') as description,
  COALESCE(pf.created_at, pf.data_competencia) as created_at,
  jsonb_build_object(
    'account_type', pf.account_type,
    'transaction_type', pf.transaction_type,
    'card_id', pf.card_id,
    'invoice_id', pf.invoice_id,
    'data_competencia', pf.data_competencia
  ) as meta,
  pf.profile_id,
  NULL::uuid as loan_id
FROM pf_transacoes pf

ORDER BY created_at DESC;

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_vw_extrato_profile_id ON transacoes(profile_id);
CREATE INDEX IF NOT EXISTS idx_vw_extrato_created_at ON transacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pf_transacoes_profile_id ON pf_transacoes(profile_id);
CREATE INDEX IF NOT EXISTS idx_pf_transacoes_created_at ON pf_transacoes(created_at DESC);
