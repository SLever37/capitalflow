
-- Adiciona a coluna nome_completo se ela não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfis' AND column_name = 'nome_completo') THEN
        ALTER TABLE public.perfis ADD COLUMN nome_completo text;
    END IF;
END $$;

-- Comentário para documentação do banco
COMMENT ON COLUMN public.perfis.nome_completo IS 'Nome jurídico completo do operador para uso em documentos legais.';

-- Força a atualização do cache do PostgREST (Supabase API)
NOTIFY pgrst, 'reload schema';
