
-- 1. Garante que as colunas de identificação aceitam textos longos e sem limites
ALTER TABLE public.perfis ALTER COLUMN senha_acesso TYPE TEXT;
ALTER TABLE public.perfis ALTER COLUMN usuario_email TYPE TEXT;
ALTER TABLE public.perfis ALTER COLUMN email TYPE TEXT;
ALTER TABLE public.perfis ALTER COLUMN nome_operador TYPE TEXT;
ALTER TABLE public.perfis ALTER COLUMN nome_exibicao TYPE TEXT;

-- 2. Recria a função de login para ser "Multi-Coluna" e resiliente
CREATE OR REPLACE FUNCTION public.login_user(login_input text, password_input text)
RETURNS SETOF public.perfis AS $$
DECLARE
    v_input text := LOWER(TRIM(login_input));
    v_pass text := TRIM(password_input);
BEGIN
    RETURN QUERY
    SELECT * FROM public.perfis
    WHERE (
        LOWER(TRIM(usuario_email)) = v_input 
        OR 
        LOWER(TRIM(COALESCE(email, ''))) = v_input
        OR 
        LOWER(TRIM(nome_operador)) = v_input
        OR
        LOWER(TRIM(COALESCE(nome_exibicao, ''))) = v_input
    )
    AND senha_acesso = v_pass
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Notifica o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
