-- Atualiza saldo da conta pessoal atomicamente
create or replace function pf_adjust_account_balance(
  p_account_id uuid,
  p_delta numeric
)
returns void
language plpgsql
security definer
as $$
begin
  update pf_contas
  set saldo = saldo + p_delta
  where id = p_account_id;
end;
$$;