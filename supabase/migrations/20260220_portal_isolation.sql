-- MIGRATION: Portal Isolation & Anon Access
-- Objetivo: Permitir que o Portal do Cliente funcione sem sessão autenticada (ANON),
-- isolando-o do contexto do operador e garantindo segurança via RPCs.

-- 1. Buscar contrato pelo Token (Entrada do Portal)
CREATE OR REPLACE FUNCTION portal_find_by_token(p_token text)
RETURNS SETOF contratos
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM contratos WHERE portal_token = p_token LIMIT 1;
$$;

-- 2. Buscar dados públicos do Cliente (Header do Portal)
CREATE OR REPLACE FUNCTION portal_get_client(p_client_id uuid)
RETURNS TABLE(id uuid, name text, document text, phone text, email text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, name, document, phone, email FROM clientes WHERE id = p_client_id LIMIT 1;
$$;

-- 3. Listar contratos do Cliente (Switcher)
CREATE OR REPLACE FUNCTION portal_list_contracts(p_client_id uuid)
RETURNS SETOF contratos
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM contratos 
  WHERE client_id = p_client_id 
  AND (is_archived IS NULL OR is_archived = false)
  ORDER BY created_at DESC;
$$;

-- 4. Buscar Parcelas de um Contrato
CREATE OR REPLACE FUNCTION portal_get_parcels(p_loan_id uuid)
RETURNS SETOF parcelas
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM parcelas WHERE loan_id = p_loan_id ORDER BY numero_parcela ASC;
$$;

-- 5. Buscar Sinalizações de um Contrato
CREATE OR REPLACE FUNCTION portal_get_signals(p_loan_id uuid)
RETURNS SETOF sinalizacoes_pagamento
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM sinalizacoes_pagamento WHERE loan_id = p_loan_id ORDER BY created_at DESC;
$$;

-- 6. Buscar Contrato Completo (Deep Fetch para Hidratação)
-- Retorna um JSON contendo o contrato + parcelas + sinalizações
CREATE OR REPLACE FUNCTION portal_get_full_loan(p_loan_id uuid)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract json;
BEGIN
  SELECT row_to_json(c) INTO v_contract
  FROM (
    SELECT *,
      (SELECT json_agg(p ORDER BY numero_parcela ASC) FROM parcelas p WHERE p.loan_id = contratos.id) as parcelas,
      (SELECT json_agg(s ORDER BY created_at DESC) FROM sinalizacoes_pagamento s WHERE s.loan_id = contratos.id) as sinalizacoes_pagamento
    FROM contratos
    WHERE id = p_loan_id
  ) c;
  
  RETURN v_contract;
END;
$$;

-- PERMISSÕES (Grant Anon)
GRANT EXECUTE ON FUNCTION portal_find_by_token TO anon;
GRANT EXECUTE ON FUNCTION portal_get_client TO anon;
GRANT EXECUTE ON FUNCTION portal_list_contracts TO anon;
GRANT EXECUTE ON FUNCTION portal_get_parcels TO anon;
GRANT EXECUTE ON FUNCTION portal_get_signals TO anon;
GRANT EXECUTE ON FUNCTION portal_get_full_loan TO anon;

-- Garantir que a RPC de pagamento também seja acessível
GRANT EXECUTE ON FUNCTION portal_submit_payment_intent TO anon;
