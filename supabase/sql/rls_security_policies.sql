
-- ==============================================================================
-- 1. LIMPEZA TOTAL E RESETS (NUCLEAR)
-- ==============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Remove funções conflitantes para recriar do zero
  FOR r IN SELECT oid::regprocedure::text as sig FROM pg_proc WHERE proname IN ('get_loan_by_portal_token', 'get_portal_contracts_by_token', 'portal_submit_payment_intent', 'get_documento_juridico_by_view_token', 'get_documento_juridico_by_id', 'check_access', 'is_team_member', 'is_team_owner') AND pronamespace = 'public'::regnamespace LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- ==============================================================================
-- 2. FUNÇÃO CENTRAL DE ACESSO (Otimizada e Sem Recursão)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_access(target_profile_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER -- Roda como Admin para não disparar RLS recursivo
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- Se não houver usuário logado, nega
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Se o alvo for nulo, nega
  IF target_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Acesso ao Próprio Dados
  IF target_profile_id = current_user_id THEN
    RETURN TRUE;
  END IF;

  -- 2. Hierarquia: Sou membro de um time cujo dono é o target_profile_id?
  -- Consulta direta nas tabelas (Security Definer ignora RLS aqui dentro)
  PERFORM 1 
  FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE tm.profile_id = current_user_id
    AND t.owner_profile_id = target_profile_id;
  
  IF FOUND THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ==============================================================================
-- 3. POLÍTICAS RLS PARA TIMES (Sem Recursão Cruzada)
-- ==============================================================================

-- Habilita RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas que causam loop
DROP POLICY IF EXISTS "Ver times" ON teams;
DROP POLICY IF EXISTS "Gerenciar times" ON teams;
DROP POLICY IF EXISTS "Ver membros" ON team_members;
DROP POLICY IF EXISTS "Gerenciar membros" ON team_members;

-- 3.1. Políticas de TIMES (Teams)
-- Pode ver se: É o dono OU é membro (verifica na tabela de membros diretamente para o user atual)
CREATE POLICY "Ver times" ON teams FOR SELECT USING (
    owner_profile_id = auth.uid() 
    OR 
    id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

CREATE POLICY "Gerenciar times" ON teams FOR ALL USING (
    owner_profile_id = auth.uid()
);

-- 3.2. Políticas de MEMBROS (Team Members)
-- Pode ver se: É o próprio membro OU é o dono do time
CREATE POLICY "Ver membros" ON team_members FOR SELECT USING (
    profile_id = auth.uid()
    OR
    team_id IN (SELECT id FROM teams WHERE owner_profile_id = auth.uid())
);

CREATE POLICY "Gerenciar membros" ON team_members FOR ALL USING (
    team_id IN (SELECT id FROM teams WHERE owner_profile_id = auth.uid())
);

-- ==============================================================================
-- 4. POLÍTICAS DE NEGÓCIO (Usando check_access otimizado)
-- ==============================================================================

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

ALTER TABLE documentos_juridicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Juridico" ON documentos_juridicos;
CREATE POLICY "Acesso Juridico" ON documentos_juridicos FOR ALL USING (
    profile_id = auth.uid() OR check_access(profile_id)
);

-- Assinaturas e Logs (Público para inserção, restrito para leitura)
ALTER TABLE assinaturas_documento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inserir Assinatura Publica" ON assinaturas_documento;
CREATE POLICY "Inserir Assinatura Publica" ON assinaturas_documento FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Ver Assinaturas" ON assinaturas_documento;
CREATE POLICY "Ver Assinaturas" ON assinaturas_documento FOR SELECT USING (true); -- Leitura pública necessária para validação no portal

-- ==============================================================================
-- 5. PERFIS (Fundamental para Login e Carregamento Inicial)
-- ==============================================================================

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Garante permissões de nível de banco
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON perfis TO anon, authenticated;

DROP POLICY IF EXISTS "Leitura de perfis" ON perfis;
CREATE POLICY "Leitura de perfis" ON perfis FOR SELECT USING (true);

DROP POLICY IF EXISTS "Edicao de perfil" ON perfis;
CREATE POLICY "Edicao de perfil" ON perfis FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Criacao de perfil" ON perfis;
CREATE POLICY "Criacao de perfil" ON perfis FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 6. RPCs PÚBLICAS (Portal e Links) - Recriação
-- ==============================================================================

CREATE FUNCTION public.get_loan_by_portal_token(p_token TEXT)
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
  SELECT * INTO v_loan FROM contratos WHERE portal_token = p_token LIMIT 1;
  IF v_loan IS NULL THEN RETURN; END IF;

  SELECT jsonb_agg(to_jsonb(p) ORDER BY p.data_vencimento ASC) INTO v_installments
  FROM parcelas p WHERE p.loan_id = v_loan.id;

  RETURN QUERY SELECT 
    v_loan.id, v_loan.profile_id, v_loan.client_id, v_loan.debtor_name, v_loan.debtor_document, v_loan.debtor_phone,
    v_loan.principal, v_loan.total_to_receive, v_loan.interest_rate, v_loan.fine_percent, v_loan.daily_interest_percent,
    v_loan.billing_cycle, v_loan.start_date, v_loan.created_at, v_loan.portal_token, v_loan.pix_key,
    COALESCE(v_installments, '[]'::jsonb);
END;
$$;

CREATE FUNCTION public.get_portal_contracts_by_token(p_token TEXT)
RETURNS SETOF contratos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  SELECT client_id INTO v_client_id FROM contratos WHERE portal_token = p_token LIMIT 1;
  IF v_client_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM contratos WHERE client_id = v_client_id AND is_archived = false ORDER BY created_at DESC;
END;
$$;

CREATE FUNCTION public.portal_submit_payment_intent(p_client_id UUID, p_loan_id UUID, p_profile_id UUID, p_tipo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
    INSERT INTO sinalizacoes_pagamento (client_id, loan_id, profile_id, tipo_intencao, status, created_at)
    VALUES (p_client_id, p_loan_id, p_profile_id, p_tipo, 'PENDENTE', NOW()) RETURNING id INTO v_id;
    RETURN jsonb_build_object('id', v_id, 'success', true);
END;
$$;

CREATE FUNCTION public.get_documento_juridico_by_view_token(p_view_token TEXT)
RETURNS SETOF documentos_juridicos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM documentos_juridicos WHERE view_token = p_view_token LIMIT 1;
END;
$$;

CREATE FUNCTION public.get_documento_juridico_by_id(p_document_id UUID)
RETURNS SETOF documentos_juridicos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM documentos_juridicos WHERE id = p_document_id LIMIT 1;
END;
$$;

-- Permissões Finais
GRANT EXECUTE ON FUNCTION public.check_access TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_loan_by_portal_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_contracts_by_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_submit_payment_intent TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_documento_juridico_by_view_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_documento_juridico_by_id TO anon, authenticated;

