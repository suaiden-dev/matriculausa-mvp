-- Create a helper RPC to check if an email already exists in auth.users
-- This allows the client (anon/authenticated) to validate before attempting signUp

create or replace function public.email_exists(in_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _exists boolean;
begin
  select exists(
    select 1 from auth.users where lower(email) = lower(in_email)
  ) into _exists;
  return coalesce(_exists, false);
end;
$$;

grant execute on function public.email_exists(text) to anon, authenticated, service_role;

comment on function public.email_exists(text) is 'Returns true if an auth user with the given email exists (case-insensitive).';


