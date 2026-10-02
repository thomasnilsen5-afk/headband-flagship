-- Roles, profile bootstrap and Row Level Security on EVERY public table.
-- Rule of thumb: the browser (anon/authenticated) can read the public catalog and its own
-- customer data. All money-moving writes go through server code using the service role or
-- through SECURITY DEFINER functions that re-check ownership.

-- ---------------------------------------------------------------------------
-- Role helpers (private schema = not exposed through PostgREST)
-- ---------------------------------------------------------------------------
create or replace function private.has_role(required public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = any (required)
  )
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$ select private.has_role(array['staff', 'admin']::public.app_role[]) $$;

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$ select private.has_role(array['admin']::public.app_role[]) $$;

revoke all on all functions in schema private from public;
grant execute on function private.has_role(public.app_role[]) to anon, authenticated;
grant execute on function private.is_staff() to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_i18n(jsonb) to anon, authenticated, service_role;
grant execute on function private.set_updated_at() to anon, authenticated, service_role;

-- Expose role to the client for UI decisions (never for authorization).
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = (select auth.uid())), 'customer'::public.app_role)
$$;
revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Profile bootstrap on sign-up
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    case when new.raw_user_meta_data->>'locale' = 'en' then 'en'::public.locale else 'nb'::public.locale end
  )
  on conflict (id) do nothing;
  -- Attach guest orders placed with the same, verified email.
  if new.email_confirmed_at is not null then
    update public.orders set user_id = new.id where user_id is null and email = new.email;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Trusted = service role, migrations, or SECURITY DEFINER functions owned by postgres.
create or replace function private.is_trusted()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role')
$$;
grant execute on function private.is_trusted() to anon, authenticated, service_role;

-- Only admins (or the server) may change roles. Everyone else keeps their role.
create or replace function private.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not (private.is_trusted() or private.is_admin()) then
    raise exception 'role change not allowed' using errcode = '42501';
  end if;
  if new.marketing_opt_in and not old.marketing_opt_in then
    new.marketing_opt_in_at := now();
  end if;
  return new;
end;
$$;
create trigger guard_profile_role before update on public.profiles
  for each row execute function private.guard_profile_role();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere (fail closed: no policy = no access)
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Public catalog: readable when active; writable by staff
-- ---------------------------------------------------------------------------
create policy collections_read on public.collections for select to anon, authenticated
  using (status = 'active' or (select private.is_staff()));
create policy collections_write on public.collections for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy drops_read on public.drops for select to anon, authenticated
  using (is_published or (select private.is_staff()));
create policy drops_write on public.drops for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy products_read on public.products for select to anon, authenticated
  using (status = 'active' or (select private.is_staff()));
create policy products_write on public.products for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy variants_read on public.product_variants for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.products p where p.id = product_id and p.status = 'active'))
    or (select private.is_staff())
  );
create policy variants_write on public.product_variants for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy media_read on public.product_media for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or (select private.is_staff())
  );
create policy media_write on public.product_media for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy bundles_read on public.bundles for select to anon, authenticated
  using (status = 'active' or (select private.is_staff()));
create policy bundles_write on public.bundles for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy bundle_items_read on public.bundle_items for select to anon, authenticated
  using (
    exists (select 1 from public.bundles b where b.id = bundle_id and b.status = 'active')
    or (select private.is_staff())
  );
create policy bundle_items_write on public.bundle_items for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- Stock levels are public (the storefront shows them live via Realtime).
create policy inventory_read on public.inventory for select to anon, authenticated using (true);
create policy inventory_write on public.inventory for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy inventory_insert on public.inventory for insert to authenticated
  with check ((select private.is_staff()));

create policy inventory_movements_read on public.inventory_movements for select to authenticated
  using ((select private.is_staff()));

create policy shipping_rates_read on public.shipping_rates for select to anon, authenticated
  using (is_active or (select private.is_staff()));
create policy shipping_rates_write on public.shipping_rates for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy content_blocks_read on public.content_blocks for select to anon, authenticated using (true);
create policy content_blocks_write on public.content_blocks for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy store_settings_read on public.store_settings for select to anon, authenticated using (true);
create policy store_settings_write on public.store_settings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Staff-only data (codes must not be enumerable by customers)
-- ---------------------------------------------------------------------------
create policy discounts_staff on public.discounts for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy discount_redemptions_staff on public.discount_redemptions for select to authenticated
  using ((select private.is_staff()));
create policy webhook_events_staff on public.webhook_events for select to authenticated
  using ((select private.is_staff()));
create policy payments_read on public.payments for select to authenticated
  using ((select private.is_staff()));
create policy inventory_reservations_staff on public.inventory_reservations for select to authenticated
  using ((select private.is_staff()));
create policy email_log_staff on public.email_log for select to authenticated
  using ((select private.is_staff()));
create policy audit_log_admin on public.audit_log for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Customer-owned data
-- ---------------------------------------------------------------------------
create policy addresses_own on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy addresses_staff_read on public.addresses for select to authenticated
  using ((select private.is_staff()));

create policy wishlist_own on public.wishlist_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy waitlist_own_read on public.waitlist_entries for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy waitlist_own_delete on public.waitlist_entries for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

create policy carts_own on public.carts for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy cart_items_own on public.cart_items for select to authenticated
  using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
    or (select private.is_staff())
  );

create policy orders_read on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy orders_staff_update on public.orders for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy order_items_read on public.order_items for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select private.is_staff())
  );

create policy returns_read on public.returns for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy returns_staff_update on public.returns for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- Reviews: published are public; authors see and edit their own while pending.
create policy reviews_read on public.reviews for select to anon, authenticated
  using (status = 'published' or user_id = (select auth.uid()) or (select private.is_staff()));
create policy reviews_insert_own on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and published_at is null);
create policy reviews_update_own_pending on public.reviews for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()) and status = 'pending' and published_at is null);
create policy reviews_staff on public.reviews for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy review_media_read on public.review_media for select to anon, authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and (r.status = 'published' or r.user_id = (select auth.uid()) or (select private.is_staff()))
    )
  );
create policy review_media_insert_own on public.review_media for insert to authenticated
  with check (
    exists (select 1 from public.reviews r where r.id = review_id and r.user_id = (select auth.uid()) and r.status = 'pending')
    and storage_path like ((select auth.uid())::text || '/%')
  );
create policy review_media_staff_delete on public.review_media for delete to authenticated
  using ((select private.is_staff()));

-- Customers cannot set moderation fields; verified-purchase is computed, never trusted.
-- SECURITY INVOKER on purpose: is_trusted() must see the caller, not the function owner.
create or replace function private.guard_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_trusted() or private.is_staff() then
    if new.status = 'published' and new.published_at is null then
      new.published_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.published_at := null;
  else
    new.status := old.status;
    new.published_at := old.published_at;
    new.user_id := old.user_id;
    new.product_id := old.product_id;
  end if;
  new.is_verified := exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = new.product_id
      and o.user_id = new.user_id
      and o.status in ('paid', 'fulfilled', 'shipped', 'delivered')
  );
  return new;
end;
$$;
create trigger guard_review before insert or update on public.reviews
  for each row execute function private.guard_review();
