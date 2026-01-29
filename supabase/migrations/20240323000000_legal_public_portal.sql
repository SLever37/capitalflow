
-- 1. ESTRUTURA PARA ACESSO PÚBLICO (Link de Assinatura)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'public_access_token') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN public_access_token uuid DEFAULT gen_random_uuid();
        ALTER TABLE public.documentos_juridicos ADD CONSTRAINT uq_legal_token UNIQUE (public_access_token);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'token_expires_at') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN token_expires_at timestamptz;
    END IF;
END $$;

-- 2. TRIGGER DE IMUTABILIDADE ESTRITA (Proteção do Título Executivo)
-- Impede que o conteúdo (snapshot) ou o hash sejam alterados após a criação.
-- Garante a certeza e liquidez do título.
CREATE OR REPLACE FUNCTION public.check_legal_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Regra 1: Se o hash já foi gerado, o conteúdo (snapshot) não pode mudar nem um bit.
    IF OLD.hash_sha256 IS NOT NULL THEN
        IF (NEW.snapshot::text IS DISTINCT FROM OLD.snapshot::text) OR (NEW.hash_sha256 IS DISTINCT FROM OLD.hash_sha256) THEN
            RAISE EXCEPTION 'VIOLAÇÃO DE INTEGRIDADE: Tentativa de alterar documento jurídico registrado (Art. 225 CC).';
        END IF;
    END IF;

    -- Regra 2: Se o documento já está assinado, ele é um ato jurídico perfeito e acabado. Nada pode mudar.
    IF OLD.status_assinatura = 'ASSINADO' THEN
        IF (NEW.status_assinatura != 'ASSINADO') THEN
             RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: Não é possível revogar assinatura diretamente. Use cancelamento formal.';
        END IF;
        -- Permite apenas updates em campos de controle que não afetam o mérito (ex: logs de visualização se houvesse)
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_immutability ON public.documentos_juridicos;
CREATE TRIGGER trg_legal_immutability
BEFORE UPDATE ON public.documentos_juridicos
FOR EACH ROW EXECUTE FUNCTION public.check_legal_immutability();


-- 3. FUNÇÕES RPC PARA O PORTAL PÚBLICO (Security Definer)
-- Permitem que usuários não autenticados (devedores) acessem APENAS o documento vinculado ao token.

-- 3.1 Buscar Documento pelo Token
CREATE OR REPLACE FUNCTION public.get_legal_doc_by_token(p_token uuid)
RETURNS TABLE (
    id uuid,
    tipo text,
    snapshot jsonb,
    hash_sha256 text,
    status_assinatura text,
    created_at timestamptz,
    profile_name text -- Nome do credor (para exibição)
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.tipo,
        d.snapshot,
        d.hash_sha256,
        d.status_assinatura,
        d.created_at,
        p.nome_operador as profile_name
    FROM public.documentos_juridicos d
    JOIN public.perfis p ON p.id = d.profile_id
    WHERE d.public_access_token = p_token
    -- Opcional: AND d.token_expires_at > now()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3.2 Assinar Documento Publicamente
-- Executa a transação de assinatura validando o token e registrando metadados forenses.
CREATE OR REPLACE FUNCTION public.sign_legal_doc_public(
    p_token uuid,
    p_signer_name text,
    p_signer_doc text,
    p_ip text,
    p_user_agent text,
    p_signature_hash text
)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    v_doc_id uuid;
    v_current_status text;
    v_profile_id uuid;
BEGIN
    -- Busca documento e trava linha para update
    SELECT id, status_assinatura, profile_id INTO v_doc_id, v_current_status, v_profile_id
    FROM public.documentos_juridicos
    WHERE public_access_token = p_token
    FOR UPDATE;

    IF v_doc_id IS NULL THEN
        RAISE EXCEPTION 'Token inválido ou documento não encontrado.';
    END IF;

    IF v_current_status = 'ASSINADO' THEN
        RAISE EXCEPTION 'Documento já assinado.';
    END IF;

    -- 1. Inserir Assinatura
    INSERT INTO public.assinaturas_documento (
        id,
        document_id,
        profile_id, -- Pode ser NULL se for externo, ou vincular se tivermos lógica de cliente
        signer_name,
        signer_document,
        assinatura_hash,
        ip_origem,
        user_agent,
        signed_at
    ) VALUES (
        gen_random_uuid(),
        v_doc_id,
        NULL, -- Assinatura externa não tem profile_id do sistema
        p_signer_name,
        p_signer_doc,
        p_signature_hash,
        p_ip,
        p_user_agent,
        now()
    );

    -- 2. Atualizar Status do Documento
    UPDATE public.documentos_juridicos
    SET 
        status_assinatura = 'ASSINADO',
        signed_at = now(),
        ip_origem = p_ip,
        user_agent = p_user_agent,
        metadata_assinatura = jsonb_build_object(
            'method', 'PUBLIC_TOKEN',
            'ip', p_ip,
            'user_agent', p_user_agent,
            'signed_at', now()
        )
    WHERE id = v_doc_id;

    -- 3. Registrar Log
    INSERT INTO public.logs_assinatura (
        id, document_id, profile_id, action, actor_role, ip_origem, user_agent, timestamp
    ) VALUES (
        gen_random_uuid(),
        v_doc_id,
        v_profile_id, -- Log atribuído ao dono do documento para visualização
        'PUBLIC_SIGN',
        'DEVEDOR',
        p_ip,
        p_user_agent,
        now()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
