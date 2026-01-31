
-- Criação dos Buckets de Armazenamento (Se não existirem)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos', 'documentos', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprovantes', 'comprovantes', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de Segurança (Storage Policies)
-- Removemos as políticas antigas se existirem para evitar o erro "policy already exists"
DROP POLICY IF EXISTS "Public Access Documentos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Documentos" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Anon Upload Comprovantes" ON storage.objects;

-- Recriação das Políticas
-- Permitir acesso público de leitura
CREATE POLICY "Public Access Documentos" ON storage.objects FOR SELECT USING (bucket_id = 'documentos');
CREATE POLICY "Public Access Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public Access Comprovantes" ON storage.objects FOR SELECT USING (bucket_id = 'comprovantes');

-- Permitir upload para usuários autenticados (Operadores)
CREATE POLICY "Auth Upload Documentos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "Auth Upload Avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Auth Upload Comprovantes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comprovantes');

-- Permitir upload anônimo APENAS para comprovantes (Portal do Cliente)
CREATE POLICY "Anon Upload Comprovantes" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'comprovantes');

-- Recarregar schema
NOTIFY pgrst, 'reload schema';
