
-- Função Atômica para Novo Aporte (Add Funds)
-- Garante integridade: Se falhar em qualquer etapa, desfaz tudo (Rollback)
CREATE OR REPLACE FUNCTION apply_new_aporte_atomic(
  p_loan_id UUID,
  p_profile_id UUID,
  p_amount NUMERIC,
  p_source_id UUID DEFAULT NULL, -- Opcional: Se nulo, usa a fonte original do contrato
  p_installment_id UUID DEFAULT NULL, -- Opcional: Alvo específico
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões de sistema para garantir acesso cross-table
AS $$
DECLARE
  v_target_inst_id UUID;
  v_source_id UUID;
  v_current_inst_status TEXT;
  v_contract_exists BOOLEAN;
BEGIN
  -- 1. Validação Básica
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'O valor do aporte deve ser maior que zero.';
  END IF;

  -- 2. Verificar Existência do Contrato
  SELECT source_id INTO v_source_id 
  FROM contratos 
  WHERE id = p_loan_id AND profile_id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado ou acesso negado.';
  END IF;

  -- Sobrescreve fonte se fornecida (caso o aporte saia de outra carteira)
  IF p_source_id IS NOT NULL THEN
    v_source_id := p_source_id;
  END IF;

  -- 3. Identificar Parcela Alvo
  -- Regra: Não cria parcela nova. Deve aplicar em uma existente PENDING.
  IF p_installment_id IS NOT NULL THEN
    SELECT id, status INTO v_target_inst_id, v_current_inst_status
    FROM parcelas
    WHERE id = p_installment_id AND loan_id = p_loan_id;

    IF v_target_inst_id IS NULL THEN
       RAISE EXCEPTION 'Parcela alvo não encontrada.';
    END IF;
    
    IF v_current_inst_status = 'PAID' THEN
       RAISE EXCEPTION 'Não é possível aportar capital em uma parcela já quitada.';
    END IF;
  ELSE
    -- Busca automática: Próxima parcela pendente (menor data/número)
    SELECT id INTO v_target_inst_id
    FROM parcelas
    WHERE loan_id = p_loan_id AND status != 'PAID'
    ORDER BY data_vencimento ASC, numero_parcela ASC
    LIMIT 1;

    IF v_target_inst_id IS NULL THEN
       RAISE EXCEPTION 'O contrato não possui parcelas em aberto para receber o aporte. Renegocie ou reabra o contrato.';
    END IF;
  END IF;

  -- 4. Execução Financeira (ATÔMICA)

  -- A) Debitar da Fonte (Caixa)
  UPDATE fontes
  SET balance = balance - p_amount
  WHERE id = v_source_id AND profile_id = p_profile_id;

  -- B) Atualizar Header do Contrato (Refletir dívida total aumentada)
  UPDATE contratos
  SET 
    principal = principal + p_amount,
    total_to_receive = total_to_receive + p_amount,
    updated_at = NOW()
  WHERE id = p_loan_id;

  -- C) Atualizar Parcela Alvo
  -- Aumenta o principal devido e o valor total da parcela
  UPDATE parcelas
  SET
    principal_remaining = principal_remaining + p_amount,
    scheduled_principal = scheduled_principal + p_amount,
    valor_parcela = valor_parcela + p_amount -- Campo amount/valor_parcela
  WHERE id = v_target_inst_id;

  -- D) Registrar no Ledger (Transação)
  -- Tipo 'LEND_MORE' garante compatibilidade com a lógica de estorno existente (ledgerReverse.ts)
  INSERT INTO transacoes (
    id,
    loan_id,
    profile_id,
    source_id,
    installment_id,
    date,
    type,
    amount,
    principal_delta, -- Positivo indica aumento de dívida neste contexto de aporte
    interest_delta,
    late_fee_delta,
    category,
    notes
  ) VALUES (
    gen_random_uuid(),
    p_loan_id,
    p_profile_id,
    v_source_id,
    v_target_inst_id,
    NOW(),
    'LEND_MORE', -- Tipo padrão do sistema para saída de capital
    p_amount,
    p_amount, -- Delta de principal
    0,
    0,
    'INVESTIMENTO',
    COALESCE(p_notes, 'Novo Aporte Adicional (Capital)')
  );

END;
$$;
