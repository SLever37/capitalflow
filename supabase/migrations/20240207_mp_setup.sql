
-- Tabela para logs de cobrança (Pix, Cartão, etc)
CREATE TABLE IF NOT EXISTS payment_charges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  charge_id UUID NOT NULL, -- ID de idempotência / referência externa
  provider_payment_id TEXT, -- ID do MP
  loan_id UUID, -- Referência solta para não travar em caso de exclusão de contrato antigo, ou use REFERENCES contratos(id)
  installment_id UUID,
  profile_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_type TEXT, -- 'FULL', 'RENEW_INTEREST', 'LEND_MORE', 'CUSTOM'
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'CANCELLED'
  provider_status TEXT,
  qr_code TEXT,
  qr_code_base64 TEXT,
  paid_at TIMESTAMPTZ,
  provider_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE payment_charges ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
-- 1. Permitir leitura pública (necessário para o Portal do Cliente "ouvir" o status sem login complexo)
CREATE POLICY "Leitura pública de charges" ON payment_charges FOR SELECT USING (true);

-- 2. Permitir inserção via Service Role (Edge Functions) - Implícito, mas bom garantir que anon não insira
-- (Nenhuma policy de INSERT para public/anon)

-- 3. Permitir atualização apenas via Service Role (Webhook)
-- (Nenhuma policy de UPDATE para public/anon)
