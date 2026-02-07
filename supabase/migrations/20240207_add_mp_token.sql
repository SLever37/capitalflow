
-- Adiciona coluna de Access Token do Mercado Pago na tabela de perfis
ALTER TABLE perfis 
ADD COLUMN IF NOT EXISTS mp_access_token TEXT;

-- (Opcional) Se quiser garantir que apenas o próprio usuário veja seu token (embora o RLS padrão já deva cobrir)
-- O RLS atual de perfis geralmente permite leitura para authenticated, o que é OK para o sistema funcionar.
