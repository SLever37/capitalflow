
-- Adiciona a coluna address_number se ela não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfis' AND column_name = 'address_number') THEN
        ALTER TABLE public.perfis ADD COLUMN address_number text;
    END IF;
END $$;

-- Comentário para documentação
COMMENT ON COLUMN public.perfis.address_number IS 'Número da residência ou estabelecimento do operador.';

-- Força a atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';
