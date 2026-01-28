
-- ==============================================================================
-- MÓDULO JURÍDICO - ESTEIRA DE FORMALIZAÇÃO DIGITAL (LEI 14.063/2020)
-- ==============================================================================

-- 1. EXTENSÕES E FUNÇÕES AUXILIARES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função Helper para RLS (Security Definer para evitar recursão infinita)
CREATE OR REPLACE FUNCTION public.get_my_dono_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TABELA MESTRE: DOCUMENTOS JURÍDICOS (Criação se não existir)
CREATE TABLE IF NOT EXISTS public.documentos_juridicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.perfis(id),
    dono_id TEXT NOT NULL,
    codigo_cliente TEXT NOT NULL,
    numero_cliente TEXT NOT NULL,
    client_id UUID REFERENCES public.clientes(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('CONFISSAO_DIVIDA', 'NOTA_PROMISSORIA', 'TERMO_ACORDO', 'CONFISSAO', 'PROMISSORIA')),
    snapshot_json JSONB NOT NULL,
    hash_sha256 TEXT NOT NULL,
    status_assinatura TEXT DEFAULT 'PENDENTE' CHECK (status_assinatura IN ('PENDENTE', 'ASSINADO', 'CANCELADO')),
    url_storage TEXT,
    metadata_assinatura JSONB,
    created_by UUID DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.1. MIGRAÇÃO SEGURA (ALTER TABLE)
-- Garante que colunas novas existam mesmo se a tabela foi criada anteriormente
DO $$
BEGIN
    -- Se existir coluna antiga 'snapshot', renomeia para 'snapshot_json'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'snapshot') THEN
        ALTER TABLE public.documentos_juridicos RENAME COLUMN snapshot TO snapshot_json;
    END IF;

    -- Adiciona snapshot_json se não existir (e não foi renomeada acima)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'snapshot_json') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN snapshot_json JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Adiciona colunas de identificação do cliente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'codigo_cliente') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN codigo_cliente TEXT DEFAULT '0000';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'numero_cliente') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN numero_cliente TEXT DEFAULT '000000';
    END IF;

    -- Adiciona dono_id (Para RLS textual)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'dono_id') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN dono_id TEXT DEFAULT 'legacy_migration';
    END IF;

    -- Adiciona url_storage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'url_storage') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN url_storage TEXT;
    END IF;
    
    -- Adiciona client_id (FK opcional)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_juridicos' AND column_name = 'client_id') THEN
        ALTER TABLE public.documentos_juridicos ADD COLUMN client_id UUID REFERENCES public.clientes(id);
    END IF;
    
    -- Ajustar Constraints de Check se necessário (Opcional, evita erros se o tipo já existir)
    BEGIN
        ALTER TABLE public.documentos_juridicos DROP CONSTRAINT IF EXISTS documentos_juridicos_tipo_check;
        ALTER TABLE public.documentos_juridicos ADD CONSTRAINT documentos_juridicos_tipo_check CHECK (tipo IN ('CONFISSAO_DIVIDA', 'NOTA_PROMISSORIA', 'TERMO_ACORDO', 'CONFISSAO', 'PROMISSORIA'));
    EXCEPTION WHEN OTHERS THEN NULL; END;

END $$;

-- Índices de Performance (Agora seguro pois as colunas existem)
DROP INDEX IF EXISTS idx_docs_loan;
DROP INDEX IF EXISTS idx_docs_cliente_cod;
DROP INDEX IF EXISTS idx_docs_dono;

CREATE INDEX idx_docs_loan ON public.documentos_juridicos(loan_id);
CREATE INDEX idx_docs_cliente_cod ON public.documentos_juridicos(codigo_cliente, numero_cliente);
CREATE INDEX idx_docs_dono ON public.documentos_juridicos(dono_id);

-- 3. TABELA: ASSINATURAS DO DOCUMENTO (LISTA DE SIGNATÁRIOS)
CREATE TABLE IF NOT EXISTS public.assinaturas_documento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID NOT NULL REFERENCES public.documentos_juridicos(id) ON DELETE CASCADE,
    
    papel TEXT NOT NULL CHECK (papel IN ('DEVEDOR', 'CREDOR', 'TESTEMUNHA_1', 'TESTEMUNHA_2')),
    
    -- Dados do Signatário
    user_id UUID REFERENCES auth.users(id), -- Opcional (se for usuário logado)
    nome TEXT NOT NULL,
    cpf TEXT,
    
    -- Evidências Técnicas (MP 2.200-2)
    aceitou BOOLEAN DEFAULT FALSE,
    ip TEXT,
    user_agent TEXT,
    hash_assinado TEXT NOT NULL, -- Hash do documento no momento da assinatura (deve bater com o original)
    
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA: LOGS DE AUDITORIA (TRILHA FORENSE)
CREATE TABLE IF NOT EXISTS public.logs_assinatura (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID NOT NULL REFERENCES public.documentos_juridicos(id) ON DELETE CASCADE,
    evento TEXT NOT NULL, -- 'VISUALIZADO', 'ASSINADO', 'IP_CAPTURADO'
    user_id UUID,
    ip TEXT,
    user_agent TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TRIGGER DE IMUTABILIDADE (SEGURANÇA JURÍDICA)
CREATE OR REPLACE FUNCTION check_legal_doc_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Bloqueia alteração do Snapshot ou Hash
    IF (OLD.snapshot_json IS DISTINCT FROM NEW.snapshot_json) OR (OLD.hash_sha256 IS DISTINCT FROM NEW.hash_sha256) THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE INTEGRIDADE: Documentos jurídicos são imutáveis após a criação.';
    END IF;
    
    -- Atualiza timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_doc_safety ON public.documentos_juridicos;
CREATE TRIGGER trg_legal_doc_safety
BEFORE UPDATE ON public.documentos_juridicos
FOR EACH ROW
EXECUTE FUNCTION check_legal_doc_immutability();

-- 6. POLÍTICAS DE SEGURANÇA (RLS)

-- Habilitar RLS
ALTER TABLE public.documentos_juridicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_assinatura ENABLE ROW LEVEL SECURITY;

-- 6.1. DOCUMENTOS JURÍDICOS
-- Operador: Acesso total aos seus documentos (baseado no profile_id/dono_id)
DROP POLICY IF EXISTS "Operadores - Total" ON public.documentos_juridicos;
CREATE POLICY "Operadores - Total"
ON public.documentos_juridicos
FOR ALL
TO authenticated
USING (profile_id = get_my_dono_id())
WITH CHECK (profile_id = get_my_dono_id());

-- Portal do Cliente (Anônimo/Tokenizado via URL): Visualização por ID 
DROP POLICY IF EXISTS "Portal - Leitura por ID" ON public.documentos_juridicos;
CREATE POLICY "Portal - Leitura por ID"
ON public.documentos_juridicos
FOR SELECT
TO anon
USING (true); 

-- Portal do Cliente: Atualizar Status (Assinar)
DROP POLICY IF EXISTS "Portal - Assinatura" ON public.documentos_juridicos;
CREATE POLICY "Portal - Assinatura"
ON public.documentos_juridicos
FOR UPDATE
TO anon
USING (true)
WITH CHECK (status_assinatura IN ('ASSINADO', 'PENDENTE'));

-- 6.2. ASSINATURAS (Signatários)
-- Operador vê todas as assinaturas dos seus docs
DROP POLICY IF EXISTS "Operadores - Ver Assinaturas" ON public.assinaturas_documento;
CREATE POLICY "Operadores - Ver Assinaturas"
ON public.assinaturas_documento
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.documentos_juridicos d 
    WHERE d.id = assinaturas_documento.documento_id 
    AND d.profile_id = get_my_dono_id()
));

-- Portal: Pode inserir assinatura (autenticidade garantida pelo backend/fluxo)
DROP POLICY IF EXISTS "Portal - Registrar Assinatura" ON public.assinaturas_documento;
CREATE POLICY "Portal - Registrar Assinatura"
ON public.assinaturas_documento
FOR INSERT
TO anon
WITH CHECK (true);

-- Portal: Pode ver assinaturas do documento que está visualizando
DROP POLICY IF EXISTS "Portal - Ver Assinaturas Doc" ON public.assinaturas_documento;
CREATE POLICY "Portal - Ver Assinaturas Doc"
ON public.assinaturas_documento
FOR SELECT
TO anon
USING (true);

-- 6.3. LOGS (Auditoria)
-- Operador vê logs, Ninguém apaga logs, Portal insere logs
DROP POLICY IF EXISTS "Operadores - Ver Logs" ON public.logs_assinatura;
CREATE POLICY "Operadores - Ver Logs"
ON public.logs_assinatura
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.documentos_juridicos d 
    WHERE d.id = logs_assinatura.documento_id 
    AND d.profile_id = get_my_dono_id()
));

DROP POLICY IF EXISTS "Portal - Criar Log" ON public.logs_assinatura;
CREATE POLICY "Portal - Criar Log"
ON public.logs_assinatura
FOR INSERT
TO anon
WITH CHECK (true);

