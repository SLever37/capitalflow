-- Migration: Create process_payment_atomic_v2 function
-- Purpose: Unified, idempotent payment processing with correct ledger handling
-- Date: 2026-02-27

CREATE OR REPLACE FUNCTION public.process_payment_atomic_v2(
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
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total numeric;
  v_remaining_count integer;
  v_caixa_livre uuid := '28646e86-cec9-4d47-b600-3b771a066a05';
BEGIN

  -- IDEMPOTÊNCIA REAL: Verificar se já foi processado
  IF EXISTS (SELECT 1 FROM transacoes WHERE idempotency_key = p_idempotency_key) THEN
    RETURN;
  END IF;

  -- LOCK PARCELA para evitar race condition
  PERFORM 1 FROM parcelas WHERE id = p_installment_id FOR UPDATE;

  -- BLOQUEAR PAGAMENTO SE JÁ ESTIVER PAID
  IF EXISTS (
    SELECT 1 FROM parcelas 
    WHERE id = p_installment_id AND status = 'PAID'
  ) THEN
    RAISE EXCEPTION 'Parcela já quitada';
  END IF;

  -- VALIDAR VALOR TOTAL
  v_total := COALESCE(p_principal_amount, 0)
           + COALESCE(p_interest_amount, 0)
           + COALESCE(p_late_fee_amount, 0);

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  -- UPDATE PARCELA: Registrar pagamento e atualizar status
  UPDATE parcelas
  SET
    paid_principal = COALESCE(paid_principal, 0) + p_principal_amount,
    paid_interest = COALESCE(paid_interest, 0) + p_interest_amount,
    paid_total = COALESCE(paid_total, 0) + v_total,
    principal_remaining = GREATEST(0, principal_remaining - p_principal_amount),
    interest_remaining = GREATEST(0, interest_remaining - p_interest_amount),
    status = CASE 
      WHEN (principal_remaining - p_principal_amount <= 0)
       AND (interest_remaining - p_interest_amount <= 0)
      THEN 'PAID'
      ELSE 'PARTIAL'
    END,
    last_payment_date = NOW()
  WHERE id = p_installment_id;

  -- LEDGER PRINCIPAL: Retorna para a fonte do empréstimo
  INSERT INTO transacoes (
    loan_id,
    installment_id,
    profile_id,
    operator_id,
    source_id,
    amount,
    principal_delta,
    interest_delta,
    late_fee_delta,
    category,
    type,
    idempotency_key,
    created_at
  )
  SELECT
    p_loan_id,
    p_installment_id,
    p_profile_id,
    p_operator_id,
    e.source_id,
    p_principal_amount,
    p_principal_amount,
    0,
    0,
    'PRINCIPAL_RETURN',
    'PAYMENT_PRINCIPAL',
    p_idempotency_key,
    NOW()
  FROM contratos e
  WHERE e.id = p_loan_id
  AND p_principal_amount > 0;

  -- LEDGER LUCRO: Vai sempre para Caixa Livre
  IF (p_interest_amount + p_late_fee_amount) > 0 THEN
    INSERT INTO transacoes (
      loan_id,
      installment_id,
      profile_id,
      operator_id,
      source_id,
      amount,
      principal_delta,
      interest_delta,
      late_fee_delta,
      category,
      type,
      idempotency_key,
      created_at
    )
    VALUES (
      p_loan_id,
      p_installment_id,
      p_profile_id,
      p_operator_id,
      v_caixa_livre,
      p_interest_amount + p_late_fee_amount,
      0,
      p_interest_amount,
      p_late_fee_amount,
      'LUCRO_EMPRESTIMO',
      'PAYMENT_PROFIT',
      p_idempotency_key || '_PROFIT',
      NOW()
    );
  END IF;

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

END;
$$;
