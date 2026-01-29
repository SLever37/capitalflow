
-- 1. Garantir que o bucket 'avatars' exista e seja público
-- Nota: Esta operação geralmente requer permissões de admin, se falhar, crie manualmente no painel Supabase > Storage
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- 2. Remover políticas antigas restritivas
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update an avatar." ON storage.objects;

-- 3. Criar novas políticas que permitem acesso via role 'anon' (necessário para seu sistema de login customizado)

-- Política de LEITURA: Qualquer pessoa (público) pode ver as fotos
CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Política de INSERÇÃO: Permite upload no bucket avatars
-- Removido o 'auth.role() = authenticated' pois seu app usa tabela de perfis própria
CREATE POLICY "Allow public upload to avatars"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' );

-- Política de ATUALIZAÇÃO: Permite sobrescrever arquivos (necessário para o upsert: true)
CREATE POLICY "Allow public update to avatars"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' )
WITH CHECK ( bucket_id = 'avatars' );

-- Política de EXCLUSÃO (Opcional): Permite remover fotos antigas
CREATE POLICY "Allow public delete from avatars"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' );
