
CREATE OR REPLACE FUNCTION process_payment_atomic(
  p_idempotency_key UUID,
  p_loan_id UUID,
  p_installment_id UUID,
  p_profile_id UUID,
  p_operator_id UUID, -- Pode ser NULL se for sistema
  p_source_id UUID,
  p_payment_type TEXT, -- 'PAYMENT_FULL', 'PAYMENT_PARTIAL', 'RENEW_INTEREST', etc.
  p_amount_to_pay NUMERIC,
  p_profit_generated NUMERIC,
  p_principal_returned NUMERIC,
  p_principal_delta NUMERIC,
  p_interest_delta NUMERIC,
  p_late_fee_delta NUMERIC,
  p_notes TEXT,
  p_new_start_date DATE, -- ou TIMESTAMP
  p_new_due_date DATE,
  p_new_principal_remaining NUMERIC,
  p_new_interest_remaining NUMERIC,
  p_new_scheduled_principal NUMERIC,
  p_new_scheduled_interest NUMERIC,
  p_new_amount NUMERIC,
  p_category TEXT DEFAULT 'RECEITA'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- 1. Atualizar Fonte (Caixa)
  -- Apenas se p_amount_to_pay > 0 e source válida
  IF p_amount_to_pay > 0 AND p_source_id IS NOT NULL THEN
    UPDATE fontes 
    SET balance = balance + p_amount_to_pay 
    WHERE id = p_source_id;
  END IF;

  -- 2. Atualizar Lucro do Perfil (Interest Balance)
  IF p_profit_generated > 0 THEN
    UPDATE perfis
    SET interest_balance = interest_balance + p_profit_generated
    WHERE id = p_profile_id;
  END IF;

  -- 3. Atualizar Parcela Alvo (Baixa ou Renovação)
  UPDATE parcelas
  SET
    status = CASE 
      WHEN p_payment_type = 'PAYMENT_FULL' THEN 'PAID' 
      ELSE 'PENDING' 
    END,
    principal_remaining = p_new_principal_remaining,
    interest_remaining = p_new_interest_remaining,
    scheduled_principal = p_new_scheduled_principal,
    scheduled_interest = p_new_scheduled_interest,
    -- Atualiza data se mudou (Renovação)
    data_vencimento = p_new_due_date,
    amount = p_new_amount, -- valor_parcela
    valor_parcela = p_new_amount,
    
    -- Acumuladores de Pagamento
    paid_principal = COALESCE(paid_principal, 0) + p_principal_delta,
    paid_interest = COALESCE(paid_interest, 0) + p_interest_delta,
    paid_late_fee = COALESCE(paid_late_fee, 0) + p_late_fee_delta,
    paid_total = COALESCE(paid_total, 0) + p_amount_to_pay,
    paid_date = CASE WHEN p_payment_type = 'PAYMENT_FULL' THEN NOW() ELSE paid_date END,
    
    -- Incrementa contador de renovações se não for quitação
    renewal_count = CASE 
      WHEN p_payment_type != 'PAYMENT_FULL' THEN COALESCE(renewal_count, 0) + 1 
      ELSE renewal_count 
    END
  WHERE id = p_installment_id;

  -- 4. Atualizar Contrato (Header)
  -- Se for renovação, move a data de início (referência de cálculo)
  IF p_payment_type != 'PAYMENT_FULL' THEN
    UPDATE contratos
    SET start_date = p_new_start_date
    WHERE id = p_loan_id;
  END IF;

  -- 5. Registrar Transação (Ledger)
  INSERT INTO transacoes (
    id,
    loan_id,
    profile_id,
    source_id,
    installment_id,
    date,
    type,
    amount,
    principal_delta,
    interest_delta,
    late_fee_delta,
    category,
    notes
  ) VALUES (
    gen_random_uuid(),
    p_loan_id,
    p_profile_id,
    p_source_id,
    p_installment_id,
    NOW(),
    p_payment_type,
    p_amount_to_pay,
    p_principal_delta,
    p_interest_delta,
    p_late_fee_delta,
    p_category,
    p_notes
  );

END;
$$;
