-- Create leads_emprestimo table
CREATE TABLE IF NOT EXISTS public.leads_emprestimo (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    valor_solicitado numeric NOT NULL,
    whatsapp text NOT NULL,
    nome text,
    status text NOT NULL DEFAULT 'NOVO',
    origem text,
    utm_source text,
    utm_campaign text,
    owner_id uuid
);

-- Create indexes
CREATE INDEX IF NOT EXISTS leads_emprestimo_created_at_idx ON public.leads_emprestimo (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_emprestimo_status_idx ON public.leads_emprestimo (status);
CREATE INDEX IF NOT EXISTS leads_emprestimo_owner_id_idx ON public.leads_emprestimo (owner_id);

-- Enable RLS
ALTER TABLE public.leads_emprestimo ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anonymous inserts (for public page)
CREATE POLICY "Allow anonymous inserts" ON public.leads_emprestimo
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Allow authenticated users to view all leads (or filter by owner_id if needed)
-- For now, assuming operators can see all leads or leads where they are owner
-- Adjust based on your multi-tenant logic. Here allowing all authenticated for simplicity as per request "fase 1"
CREATE POLICY "Allow authenticated view" ON public.leads_emprestimo
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to update leads
CREATE POLICY "Allow authenticated update" ON public.leads_emprestimo
    FOR UPDATE
    TO authenticated
    USING (true);
