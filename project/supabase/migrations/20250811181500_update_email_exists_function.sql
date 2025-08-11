-- Broaden email_exists to also check auth.identities (some edge states may not reflect immediately in auth.users)

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
    select 1 from auth.users u where lower(u.email) = lower(in_email)
    union all
    select 1 from auth.identities i
    where lower(coalesce((i.identity_data ->> 'email')::text, '')) = lower(in_email)
    limit 1
  ) into _exists;
  return coalesce(_exists, false);
end;
$$;

grant execute on function public.email_exists(text) to anon, authenticated, service_role;

comment on function public.email_exists(text) is 'Returns true if an auth user/identity with the given email exists (case-insensitive).';


