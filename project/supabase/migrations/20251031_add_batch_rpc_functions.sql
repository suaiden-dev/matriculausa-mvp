-- Batch RPC Functions (ADDITIVE ONLY) - Safe for production
-- This migration only CREATES new functions. It does not drop/alter existing ones.

-- 1) Batch: get_user_fee_overrides_batch
-- Returns fee overrides for a list of user_ids in a single call
create or replace function public.get_user_fee_overrides_batch(
  p_user_ids uuid[]
)
returns table (
  user_id uuid,
  selection_process_fee numeric,
  application_fee numeric,
  scholarship_fee numeric,
  i20_control_fee numeric
) language sql stable security definer
as $$
  select
    ufo.user_id,
    ufo.selection_process_fee,
    ufo.application_fee,
    ufo.scholarship_fee,
    ufo.i20_control_fee
  from public.user_fee_overrides ufo
  where ufo.user_id = any(p_user_ids)
$$;

comment on function public.get_user_fee_overrides_batch(uuid[]) is
  'Batch version: returns fee overrides for multiple users. Additive-only; legacy functions remain untouched.';


-- 2) Batch: get_payment_dates_batch
-- Returns latest payment dates by fee_type for a list of user_ids
create or replace function public.get_payment_dates_batch(
  p_user_ids uuid[]
)
returns table (
  user_id uuid,
  fee_type text,
  payment_date timestamptz
) language sql stable security definer
as $$
  with payments as (
    select
      ifp.user_id,
      ifp.fee_type::text as fee_type,
      ifp.payment_date,
      row_number() over (partition by ifp.user_id, ifp.fee_type order by ifp.payment_date desc) as rn
    from public.individual_fee_payments ifp
    where ifp.user_id = any(p_user_ids)
      and ifp.fee_type in ('selection_process','application','scholarship','i20_control')
  )
  select user_id, fee_type, payment_date
  from payments
  where rn = 1
$$;

comment on function public.get_payment_dates_batch(uuid[]) is
  'Batch version: returns latest individual fee payment dates for multiple users.';


-- 3) Batch: get_unread_notifications_batch
-- Returns unread admin-student chat notifications grouped by recipient (admin) ids
create or replace function public.get_unread_notifications_batch(
  p_admin_ids uuid[]
)
returns table (
  recipient_id uuid,
  notifications jsonb
) language sql stable security definer
as $$
  select
    n.recipient_id,
    coalesce(jsonb_agg(to_jsonb(n) order by n.created_at) filter (where n.id is not null), '[]'::jsonb) as notifications
  from public.admin_student_chat_notifications n
  where n.recipient_id = any(p_admin_ids)
    and n.read_at is null
  group by n.recipient_id
$$;

comment on function public.get_unread_notifications_batch(uuid[]) is
  'Batch version: returns unread notifications for multiple admins as JSON array per recipient.';


-- Grants (optional; keep permissive similar to existing RPCs)
-- Adjust roles according to your project roles
do $$
begin
  perform 1;
  -- Example grants; ensure matching with existing policy for RPCs
  grant execute on function public.get_user_fee_overrides_batch(uuid[]) to anon, authenticated, service_role;
  grant execute on function public.get_payment_dates_batch(uuid[]) to anon, authenticated, service_role;
  grant execute on function public.get_unread_notifications_batch(uuid[]) to anon, authenticated, service_role;
exception when others then
  -- ignore grant errors in case roles differ
  null;
end $$;


