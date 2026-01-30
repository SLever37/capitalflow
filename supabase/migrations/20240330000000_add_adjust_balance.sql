
-- Função para ajustar saldo da fonte (usada em contratos e gestão de caixa)
CREATE OR REPLACE FUNCTION public.adjust_source_balance(p_source_id uuid, p_delta numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.fontes
    SET balance = balance + p_delta
    WHERE id = p_source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notificar recarregamento do schema
NOTIFY pgrst, 'reload schema';
