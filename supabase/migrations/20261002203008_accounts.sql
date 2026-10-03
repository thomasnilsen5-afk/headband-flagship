-- Phase 5: accounts.
-- Guest orders join the account once the customer proves they own the email address.
-- The sign-up trigger only covers users created already-confirmed; email OTP users are
-- confirmed later, so the app calls this right after a successful sign-in.
create or replace function public.claim_guest_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_count integer;
begin
  if v_uid is null then
    return 0;
  end if;
  select email into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  if v_email is null then
    return 0;
  end if;
  update public.orders set user_id = v_uid where user_id is null and lower(email) = lower(v_email);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.claim_guest_orders() from public, anon;
grant execute on function public.claim_guest_orders() to authenticated;
