
-- ==============================================================================
-- 1. LIMPEZA SEGURA DE FUNÇÕES (NUCLEAR DROP BY OID)
-- Remove todas as variações das funções conflitantes iterando pelo catálogo do Postgres
-- Isso resolve o erro "function name is not unique" (42725)
-- ==============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- get_loan_by_portal_token
  FOR r IN SELECT oid::regprocedure::text as sig FROM pg_proc WHERE proname = 'get_loan_by_portal_token' AND pronamespace = 'public'::regnamespace LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;

  -- get_portal_contracts_by_token
  FOR r IN SELECT oid::regprocedure::text as sig FROM pg_proc WHERE proname = 'get_portal_contracts_by_token' AND pronamespace = 'public'::regnamespace LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;

  -- portal_submit_payment_intent
  FOR r IN SELECT oid::regprocedure::text as sig FROM pg_proc WHERE proname = 'portal_submit_payment_intent' AND pronamespace = 'public'::regnamespace LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;

  -- get_documento_juridico_by_view_token
  FOR r IN SELECT oid::regprocedure::text as sig FROM pg_proc WHERE proname = 'get_documento_juridico_by_view_token' AND pronamespace = 'public'::regnamespace LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;

  -- get_documento_juridico_by_id
  FOR r IN SELECT oid::regprocedure::text as sig FROM pg_proc WHERE proname = 'get_documento_juridico_by_id' AND pronamespace = 'public'::regnamespace LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
  
  -- check_access
  FOR r IN SELECT oid::regprocedure::text as sig FROM pg_proc WHERE proname = 'check_access' AND pronamespace = 'public'::regnamespace LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
  
  -- is_team_member
  FOR r IN SELECT oid::regprocedure::text as sig FROM pg_proc WHERE proname = 'is_team_member' AND pronamespace = 'public'::regnamespace LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;

  -- is_team_owner
  FOR r IN SELECT oid::regprocedure::text as sig FROM pg_proc WHERE proname = 'is_team_owner' AND pronamespace = 'public'::regnamespace LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- ==============================================================================
-- 2. FUNÇÕES AUXILIARES DE SEGURANÇA
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_team_member(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_id = target_team_id
    AND profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM teams
    WHERE id = target_team_id
    AND owner_profile_id = auth.uid()
  );
$$;

-- ==============================================================================
-- 3. FUNÇÃO CENTRAL DE ACESSO (Membros e Hierarquia)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_access(target_profile_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- Proteção contra sessão inválida ou nulos
  IF current_user_id IS NULL OR target_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Atalho de Performance: Se for o dono, libera direto
  IF target_profile_id = current_user_id THEN
    RETURN TRUE;
  END IF;

  -- Acesso de Membro aos dados do Chefe (Hierarquia)
  -- Verifica se o usuário atual é membro de algum time cujo dono é o target_profile_id
  PERFORM 1 
  FROM team_members tm
  INNER JOIN teams t ON tm.team_id = t.id
  WHERE tm.profile_id = current_user_id
    AND t.owner_profile_id = target_profile_id;
  
  IF FOUND THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ==============================================================================
-- 4. RPCs DO PORTAL DO CLIENTE
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_loan_by_portal_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  client_id UUID,
  debtor_name TEXT,
  debtor_document TEXT,
  debtor_phone TEXT,
  principal NUMERIC,
  total_to_receive NUMERIC,
  interest_rate NUMERIC,
  fine_percent NUMERIC,
  daily_interest_percent NUMERIC,
  billing_cycle TEXT,
  start_date DATE,
  created_at TIMESTAMPTZ,
  portal_token TEXT,
  pix_key TEXT,
  installments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan RECORD;
  v_installments JSONB;
BEGIN
  SELECT * INTO v_loan
  FROM contratos
  WHERE portal_token = p_token
  LIMIT 1;

  IF v_loan IS NULL THEN
    RETURN;
  END IF;

  SELECT jsonb_agg(to_jsonb(p) ORDER BY p.data_vencimento ASC)
  INTO v_installments
  FROM parcelas p
  WHERE p.loan_id = v_loan.id;

  RETURN QUERY SELECT 
    v_loan.id,
    v_loan.profile_id,
    v_loan.client_id,
    v_loan.debtor_name,
    v_loan.debtor_document,
    v_loan.debtor_phone,
    v_loan.principal,
    v_loan.total_to_receive,
    v_loan.interest_rate,
    v_loan.fine_percent,
    v_loan.daily_interest_percent,
    v_loan.billing_cycle,
    v_loan.start_date,
    v_loan.created_at,
    v_loan.portal_token,
    v_loan.pix_key,
    COALESCE(v_installments, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_portal_contracts_by_token(p_token TEXT)
RETURNS SETOF contratos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  SELECT client_id INTO v_client_id
  FROM contratos
  WHERE portal_token = p_token
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM contratos
  WHERE client_id = v_client_id
  AND is_archived = false
  ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_submit_payment_intent(
    p_client_id UUID,
    p_loan_id UUID,
    p_profile_id UUID,
    p_tipo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO sinalizacoes_pagamento (
        client_id, loan_id, profile_id, tipo_intencao, status, created_at
    ) VALUES (
        p_client_id, p_loan_id, p_profile_id, p_tipo, 'PENDENTE', NOW()
    ) RETURNING id INTO v_id;
    
    RETURN jsonb_build_object('id', v_id, 'success', true);
END;
$$;

-- ==============================================================================
-- 5. RPCs DO JURÍDICO
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_documento_juridico_by_view_token(p_view_token TEXT)
RETURNS SETOF documentos_juridicos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM documentos_juridicos
  WHERE view_token = p_view_token
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_documento_juridico_by_id(p_document_id UUID)
RETURNS SETOF documentos_juridicos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM documentos_juridicos
  WHERE id = p_document_id
  LIMIT 1;
END;
$$;

-- ==============================================================================
-- 6. GRANTS
-- ==============================================================================

GRANT EXECUTE ON FUNCTION public.check_access TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_owner TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_loan_by_portal_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_contracts_by_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_submit_payment_intent TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_documento_juridico_by_view_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_documento_juridico_by_id TO anon, authenticated;

-- ==============================================================================
-- 7. POLÍTICAS RLS (RECRIAÇÃO TOTAL)
-- ==============================================================================

-- Times
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver times" ON teams;
CREATE POLICY "Ver times" ON teams FOR SELECT USING (owner_profile_id = auth.uid() OR public.is_team_member(id));
DROP POLICY IF EXISTS "Gerenciar times" ON teams;
CREATE POLICY "Gerenciar times" ON teams FOR ALL USING (owner_profile_id = auth.uid());

-- Membros
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver membros" ON team_members;
CREATE POLICY "Ver membros" ON team_members FOR SELECT USING (profile_id = auth.uid() OR public.is_team_owner(team_id));
DROP POLICY IF EXISTS "Gerenciar membros" ON team_members;
CREATE POLICY "Gerenciar membros" ON team_members FOR ALL USING (public.is_team_owner(team_id));

-- Tabelas de Negócio

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Clientes" ON clientes;
CREATE POLICY "Acesso Clientes" ON clientes FOR ALL USING (
    profile_id = auth.uid() OR check_access(profile_id)
);

ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Contratos" ON contratos;
CREATE POLICY "Acesso Contratos" ON contratos FOR ALL USING (
    profile_id = auth.uid() OR check_access(profile_id)
);

ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Parcelas" ON parcelas;
CREATE POLICY "Acesso Parcelas" ON parcelas FOR ALL USING (
    profile_id = auth.uid() OR check_access(profile_id)
);

ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Transacoes" ON transacoes;
CREATE POLICY "Acesso Transacoes" ON transacoes FOR ALL USING (
    profile_id = auth.uid() OR check_access(profile_id)
);

ALTER TABLE fontes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Fontes" ON fontes;
CREATE POLICY "Acesso Fontes" ON fontes FOR ALL USING (
    profile_id = auth.uid() OR check_access(profile_id) OR operador_permitido_id = auth.uid()
);

-- Jurídico
ALTER TABLE documentos_juridicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Juridico" ON documentos_juridicos;
CREATE POLICY "Acesso Juridico" ON documentos_juridicos FOR ALL USING (
    profile_id = auth.uid() OR check_access(profile_id)
);

-- Assinaturas
ALTER TABLE assinaturas_documento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inserir Assinatura Publica" ON assinaturas_documento;
CREATE POLICY "Inserir Assinatura Publica" ON assinaturas_documento FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Ver Assinaturas" ON assinaturas_documento;
CREATE POLICY "Ver Assinaturas" ON assinaturas_documento FOR SELECT USING (true); 

-- Perfis (CRÍTICO: Garantir acesso público para login)
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Garante que permissões de SELECT estejam ativas para todos
GRANT SELECT ON perfis TO anon, authenticated, service_role;
GRANT ALL ON perfis TO service_role;

DROP POLICY IF EXISTS "Leitura de perfis" ON perfis;
CREATE POLICY "Leitura de perfis" ON perfis FOR SELECT USING (true);

DROP POLICY IF EXISTS "Edicao de perfil" ON perfis;
CREATE POLICY "Edicao de perfil" ON perfis FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Criacao de perfil" ON perfis;
CREATE POLICY "Criacao de perfil" ON perfis FOR INSERT WITH CHECK (true);
