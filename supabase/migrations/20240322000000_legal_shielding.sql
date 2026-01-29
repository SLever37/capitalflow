
-- TAREFA 1: ESTRUTURA JURÍDICA (Colunas de Integridade e Metadados)

-- 1.1 Tabela documentos_juridicos
DO $$ 
BEGIN 
    -- Garantir colunas de snapshot e hash (Imutabilidade)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'snapshot') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN snapshot jsonb DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'hash_sha256') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN hash_sha256 text;
    END IF;

    -- Garantir metadados de assinatura e ambiente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'status_assinatura') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN status_assinatura text DEFAULT 'PENDENTE';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'metadata_assinatura') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN metadata_assinatura jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'ip_origem') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN ip_origem text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'user_agent') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN user_agent text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'signed_at') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN signed_at timestamptz;
    END IF;
END $$;

-- 1.2 Tabela assinaturas_documento
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assinaturas_documento' AND column_name = 'signer_name') THEN
        ALTER TABLE public.assinaturas_documento ADD COLUMN signer_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assinaturas_documento' AND column_name = 'signer_document') THEN
        ALTER TABLE public.assinaturas_documento ADD COLUMN signer_document text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assinaturas_documento' AND column_name = 'signer_email') THEN
        ALTER TABLE public.assinaturas_documento ADD COLUMN signer_email text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assinaturas_documento' AND column_name = 'assinatura_hash') THEN
        ALTER TABLE public.assinaturas_documento ADD COLUMN assinatura_hash text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assinaturas_documento' AND column_name = 'ip_origem') THEN
        ALTER TABLE public.assinaturas_documento ADD COLUMN ip_origem text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assinaturas_documento' AND column_name = 'user_agent') THEN
        ALTER TABLE public.assinaturas_documento ADD COLUMN user_agent text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assinaturas_documento' AND column_name = 'signed_at') THEN
        ALTER TABLE public.assinaturas_documento ADD COLUMN signed_at timestamptz DEFAULT now();
    END IF;
END $$;

-- 1.3 Tabela logs_assinatura
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logs_assinatura' AND column_name = 'action') THEN
        ALTER TABLE public.logs_assinatura ADD COLUMN action text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logs_assinatura' AND column_name = 'actor_role') THEN
        ALTER TABLE public.logs_assinatura ADD COLUMN actor_role text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logs_assinatura' AND column_name = 'ip_origem') THEN
        ALTER TABLE public.logs_assinatura ADD COLUMN ip_origem text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logs_assinatura' AND column_name = 'user_agent') THEN
        ALTER TABLE public.logs_assinatura ADD COLUMN user_agent text;
    END IF;
END $$;

-- TAREFA 2: FUNÇÕES DE AUDITORIA (SECURITY DEFINER)

-- 2.1 Registrar Log Jurídico
-- Garante que o log seja gravado mesmo que o usuário tenha permissões restritas, usando privilégios do definidor.
CREATE OR REPLACE FUNCTION public.registrar_log_juridico(
    p_documento_id uuid,
    p_action text,
    p_actor_role text,
    p_ip text,
    p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.logs_assinatura (
        document_id,
        profile_id, -- Assume contexto do usuário atual
        action,
        actor_role,
        ip_origem,
        user_agent,
        timestamp
    ) VALUES (
        p_documento_id,
        auth.uid(),
        p_action,
        p_actor_role,
        p_ip,
        p_user_agent,
        now()
    );
END;
$$;

-- 2.2 Validar Integridade (Server-Side Check)
-- Verifica se o documento existe e se o hash fornecido bate com o armazenado.
-- Útil para validação rápida antes de processos críticos.
CREATE OR REPLACE FUNCTION public.validar_integridade_documento(
    p_documento_id uuid,
    p_hash_fornecido text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hash_armazenado text;
BEGIN
    SELECT hash_sha256 INTO v_hash_armazenado
    FROM public.documentos_juridicos
    WHERE id = p_documento_id;

    IF v_hash_armazenado IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN v_hash_armazenado = p_hash_fornecido;
END;
$$;
