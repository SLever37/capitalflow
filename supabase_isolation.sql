-- 1) Criar funções SECURITY DEFINER para obter o perfil e o tenant atual
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.perfis WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(owner_profile_id, id) FROM public.perfis WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 2) Migrar RLS para todas as tabelas sensíveis

-- Tabela: perfis
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento de tenant para perfis (SELECT)" ON public.perfis;
CREATE POLICY "Isolamento de tenant para perfis (SELECT)" ON public.perfis
  FOR SELECT USING (
    id = public.current_profile_id() OR 
    owner_profile_id = public.current_owner_id() OR 
    id = public.current_owner_id()
  );

DROP POLICY IF EXISTS "Isolamento de tenant para perfis (UPDATE)" ON public.perfis;
CREATE POLICY "Isolamento de tenant para perfis (UPDATE)" ON public.perfis
  FOR UPDATE USING (
    id = public.current_profile_id() OR 
    owner_profile_id = public.current_owner_id()
  );

-- Tabela: clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento de tenant para clientes (SELECT)" ON public.clientes;
CREATE POLICY "Isolamento de tenant para clientes (SELECT)" ON public.clientes
  FOR SELECT USING (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para clientes (INSERT)" ON public.clientes;
CREATE POLICY "Isolamento de tenant para clientes (INSERT)" ON public.clientes
  FOR INSERT WITH CHECK (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para clientes (UPDATE)" ON public.clientes;
CREATE POLICY "Isolamento de tenant para clientes (UPDATE)" ON public.clientes
  FOR UPDATE USING (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para clientes (DELETE)" ON public.clientes;
CREATE POLICY "Isolamento de tenant para clientes (DELETE)" ON public.clientes
  FOR DELETE USING (owner_id = public.current_owner_id());

-- Tabela: contratos
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento de tenant para contratos (SELECT)" ON public.contratos;
CREATE POLICY "Isolamento de tenant para contratos (SELECT)" ON public.contratos
  FOR SELECT USING (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para contratos (INSERT)" ON public.contratos;
CREATE POLICY "Isolamento de tenant para contratos (INSERT)" ON public.contratos
  FOR INSERT WITH CHECK (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para contratos (UPDATE)" ON public.contratos;
CREATE POLICY "Isolamento de tenant para contratos (UPDATE)" ON public.contratos
  FOR UPDATE USING (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para contratos (DELETE)" ON public.contratos;
CREATE POLICY "Isolamento de tenant para contratos (DELETE)" ON public.contratos
  FOR DELETE USING (owner_id = public.current_owner_id());

-- Tabela: fontes
ALTER TABLE public.fontes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento de tenant para fontes (SELECT)" ON public.fontes;
CREATE POLICY "Isolamento de tenant para fontes (SELECT)" ON public.fontes
  FOR SELECT USING (profile_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para fontes (INSERT)" ON public.fontes;
CREATE POLICY "Isolamento de tenant para fontes (INSERT)" ON public.fontes
  FOR INSERT WITH CHECK (profile_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para fontes (UPDATE)" ON public.fontes;
CREATE POLICY "Isolamento de tenant para fontes (UPDATE)" ON public.fontes
  FOR UPDATE USING (profile_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para fontes (DELETE)" ON public.fontes;
CREATE POLICY "Isolamento de tenant para fontes (DELETE)" ON public.fontes
  FOR DELETE USING (profile_id = public.current_owner_id());

-- Tabela: mensagens_suporte (depende de loan_id -> contratos)
ALTER TABLE public.mensagens_suporte ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento de tenant para mensagens_suporte (SELECT)" ON public.mensagens_suporte;
CREATE POLICY "Isolamento de tenant para mensagens_suporte (SELECT)" ON public.mensagens_suporte
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contratos c 
      WHERE c.id = mensagens_suporte.loan_id 
      AND c.owner_id = public.current_owner_id()
    )
  );

DROP POLICY IF EXISTS "Isolamento de tenant para mensagens_suporte (INSERT)" ON public.mensagens_suporte;
CREATE POLICY "Isolamento de tenant para mensagens_suporte (INSERT)" ON public.mensagens_suporte
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contratos c 
      WHERE c.id = loan_id 
      AND c.owner_id = public.current_owner_id()
    )
  );

DROP POLICY IF EXISTS "Isolamento de tenant para mensagens_suporte (UPDATE)" ON public.mensagens_suporte;
CREATE POLICY "Isolamento de tenant para mensagens_suporte (UPDATE)" ON public.mensagens_suporte
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.contratos c 
      WHERE c.id = loan_id 
      AND c.owner_id = public.current_owner_id()
    )
  );

-- Tabela: support_tickets (depende de loan_id -> contratos)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento de tenant para support_tickets (SELECT)" ON public.support_tickets;
CREATE POLICY "Isolamento de tenant para support_tickets (SELECT)" ON public.support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contratos c 
      WHERE c.id = support_tickets.loan_id 
      AND c.owner_id = public.current_owner_id()
    )
  );

DROP POLICY IF EXISTS "Isolamento de tenant para support_tickets (INSERT)" ON public.support_tickets;
CREATE POLICY "Isolamento de tenant para support_tickets (INSERT)" ON public.support_tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contratos c 
      WHERE c.id = loan_id 
      AND c.owner_id = public.current_owner_id()
    )
  );

DROP POLICY IF EXISTS "Isolamento de tenant para support_tickets (UPDATE)" ON public.support_tickets;
CREATE POLICY "Isolamento de tenant para support_tickets (UPDATE)" ON public.support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.contratos c 
      WHERE c.id = loan_id 
      AND c.owner_id = public.current_owner_id()
    )
  );

-- Tabela: support_presence (depende de loan_id -> contratos)
ALTER TABLE public.support_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento de tenant para support_presence (SELECT)" ON public.support_presence;
CREATE POLICY "Isolamento de tenant para support_presence (SELECT)" ON public.support_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contratos c 
      WHERE c.id = support_presence.loan_id 
      AND c.owner_id = public.current_owner_id()
    )
  );

DROP POLICY IF EXISTS "Isolamento de tenant para support_presence (INSERT)" ON public.support_presence;
CREATE POLICY "Isolamento de tenant para support_presence (INSERT)" ON public.support_presence
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contratos c 
      WHERE c.id = loan_id 
      AND c.owner_id = public.current_owner_id()
    )
  );

DROP POLICY IF EXISTS "Isolamento de tenant para support_presence (UPDATE)" ON public.support_presence;
CREATE POLICY "Isolamento de tenant para support_presence (UPDATE)" ON public.support_presence
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.contratos c 
      WHERE c.id = loan_id 
      AND c.owner_id = public.current_owner_id()
    )
  );

-- Tabela: campaign_leads (se houver owner_id ou profile_id)
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento de tenant para campaign_leads (SELECT)" ON public.campaign_leads;
CREATE POLICY "Isolamento de tenant para campaign_leads (SELECT)" ON public.campaign_leads
  FOR SELECT USING (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para campaign_leads (INSERT)" ON public.campaign_leads;
CREATE POLICY "Isolamento de tenant para campaign_leads (INSERT)" ON public.campaign_leads
  FOR INSERT WITH CHECK (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para campaign_leads (UPDATE)" ON public.campaign_leads;
CREATE POLICY "Isolamento de tenant para campaign_leads (UPDATE)" ON public.campaign_leads
  FOR UPDATE USING (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Isolamento de tenant para campaign_leads (DELETE)" ON public.campaign_leads;
CREATE POLICY "Isolamento de tenant para campaign_leads (DELETE)" ON public.campaign_leads
  FOR DELETE USING (owner_id = public.current_owner_id());
