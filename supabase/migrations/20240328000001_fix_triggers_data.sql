
-- 1. REMOVER TRIGGERS RECURSIVOS (Causa do Stack Depth Exceeded)
-- Removemos triggers comuns de atualização de timestamp que podem estar em loop
DROP TRIGGER IF EXISTS on_profile_update ON public.perfis;
DROP TRIGGER IF EXISTS update_profile_timestamp ON public.perfis;
DROP TRIGGER IF EXISTS handle_updated_at ON public.perfis;
DROP TRIGGER IF EXISTS set_updated_at ON public.perfis;

-- 2. CORRIGIR DADOS DE PERFIL (Causa do "Bem-vindo, Usuário")
-- Se nome_operador estiver nulo, preenche com Nome da Empresa ou parte do Email
UPDATE public.perfis 
SET nome_operador = COALESCE(
    NULLIF(TRIM(nome_operador), ''), 
    NULLIF(TRIM(nome_empresa), ''), 
    SPLIT_PART(email, '@', 1),
    'Operador'
)
WHERE nome_operador IS NULL OR TRIM(nome_operador) = '';

-- 3. GARANTIR INTEGRIDADE DA COLUNA NOME
ALTER TABLE public.perfis ALTER COLUMN nome_operador SET DEFAULT 'Operador';

-- 4. REFRESH NO SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
