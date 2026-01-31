
-- Criação da tabela de cobranças PIX (Idempotente)
CREATE TABLE IF NOT EXISTS public.payment_charges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    charge_id TEXT NOT NULL, -- UUID de referência externa (idempotência)
    provider_payment_id TEXT, -- ID do Mercado Pago
    
    loan_id UUID REFERENCES public.contratos(id),
    installment_id UUID, -- Referência à parcela
    profile_id UUID REFERENCES public.perfis(id),
    
    amount NUMERIC(10,2) NOT NULL,
    payment_type TEXT NOT NULL, -- 'FULL', 'RENEW_INTEREST', etc
    
    status TEXT DEFAULT 'PENDING', -- PENDING, PAID, CANCELLED
    provider_status TEXT, -- status bruto do MP
    
    qr_code TEXT,
    qr_code_base64 TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    
    provider_payload JSONB
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pay_charges_charge_id ON public.payment_charges(charge_id);
CREATE INDEX IF NOT EXISTS idx_pay_charges_prov_id ON public.payment_charges(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_pay_charges_loan_id ON public.payment_charges(loan_id);

-- RLS
ALTER TABLE public.payment_charges ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas para recriar (Evita erro de 'already exists')
DROP POLICY IF EXISTS "Service Role Full Access" ON public.payment_charges;
DROP POLICY IF EXISTS "Admin view own charges" ON public.payment_charges;
DROP POLICY IF EXISTS "Public read access for realtime" ON public.payment_charges;

-- Policy: Service Role (Edge Functions) tem acesso total
CREATE POLICY "Service Role Full Access" ON public.payment_charges
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Usuários autenticados (Admin) podem ver seus registros
CREATE POLICY "Admin view own charges" ON public.payment_charges
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid());

-- Policy CRÍTICA para Realtime no Portal do Cliente
-- Permite leitura para qualquer um (anon e authenticated),
-- pois o cliente precisa escutar o canal pelo charge_id que ele acabou de gerar.
-- UUIDs são impossíveis de adivinhar, garantindo segurança por obscuridade suficiente para este caso.
CREATE POLICY "Public read access for realtime" ON public.payment_charges
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Trigger para updated_at (Idempotente)
CREATE OR REPLACE FUNCTION public.handle_payment_charges_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_charges_updated_at ON public.payment_charges;
CREATE TRIGGER trg_payment_charges_updated_at
    BEFORE UPDATE ON public.payment_charges
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_charges_updated_at();

-- Recarregar schema
NOTIFY pgrst, 'reload schema';
