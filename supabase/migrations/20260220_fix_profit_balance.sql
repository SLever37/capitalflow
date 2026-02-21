-- RPC para ajuste atômico de saldos (Lucro e Capital Disponível)
-- Garante que recebimentos reflitam imediatamente no perfil do usuário/gestor.

CREATE OR REPLACE FUNCTION rpc_adjust_balances(
  p_profile_id UUID,
  p_profit_amount NUMERIC,
  p_principal_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE perfis
  SET 
    interest_balance = COALESCE(interest_balance, 0) + p_profit_amount,
    total_available_capital = COALESCE(total_available_capital, 0) + p_principal_amount
  WHERE id = p_profile_id;
END;
$$;
