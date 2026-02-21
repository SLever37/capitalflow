-- Create table
CREATE TABLE IF NOT EXISTS public.campaign_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL,
    session_token uuid NOT NULL UNIQUE,
    nome text NOT NULL,
    whatsapp text NOT NULL,
    cpf text NOT NULL,
    valor_escolhido numeric NOT NULL,
    ip text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- RPC
CREATE OR REPLACE FUNCTION public.campaign_create_lead_session(
    p_campaign_id uuid,
    p_nome text,
    p_whatsapp text,
    p_cpf text,
    p_valor numeric,
    p_ip text,
    p_user_agent text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_token uuid;
BEGIN
    v_session_token := gen_random_uuid();

    INSERT INTO public.campaign_leads (
        campaign_id,
        session_token,
        nome,
        whatsapp,
        cpf,
        valor_escolhido,
        ip,
        user_agent
    ) VALUES (
        p_campaign_id,
        v_session_token,
        p_nome,
        p_whatsapp,
        p_cpf,
        p_valor,
        p_ip,
        p_user_agent
    );

    RETURN json_build_object('ok', true, 'session_token', v_session_token);
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.campaign_create_lead_session TO anon;
GRANT EXECUTE ON FUNCTION public.campaign_create_lead_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.campaign_create_lead_session TO service_role;
