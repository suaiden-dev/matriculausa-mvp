-- Cria a função decrypt_data que apenas retorna o valor original (sem criptografia)
create or replace function public.decrypt_data(encrypted_data text)
returns text
language sql
as $$
  select encrypted_data;
$$; 