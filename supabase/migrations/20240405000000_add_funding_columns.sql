
-- Adiciona colunas para controle de Custo de Captação (Cartão/Empréstimo)
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS funding_total_payable NUMERIC(10,2) NULL,
ADD COLUMN IF NOT EXISTS funding_cost NUMERIC(10,2) NULL,
ADD COLUMN IF NOT EXISTS funding_provider TEXT NULL,
ADD COLUMN IF NOT EXISTS funding_fee_percent NUMERIC(6,3) NULL;

-- Garante que o PostgREST recarregue a estrutura
NOTIFY pgrst, 'reload schema';
