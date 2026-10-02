-- Transactional commerce primitives. All of these run as SECURITY DEFINER and are callable
-- ONLY by the service role (server code), except where noted. Each one is idempotent or
-- fails atomically, so retries from webhooks and flaky networks are safe.

-- ---------------------------------------------------------------------------
-- Inventory ledger: every on_hand change is recorded with a reason.
-- ---------------------------------------------------------------------------
create or replace function private.log_inventory_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta integer;
  v_reason text := coalesce(
    nullif(current_setting('app.inventory_reason', true), ''),
    case when tg_op = 'INSERT' then 'initial' else 'adjustment' end
  );
begin
  v_delta := new.on_hand - coalesce(case when tg_op = 'UPDATE' then old.on_hand end, 0);
  if v_delta <> 0 then
    insert into public.inventory_movements (variant_id, delta, reason, ref, actor_id)
    values (
      new.variant_id, v_delta,
      v_reason,
      nullif(current_setting('app.inventory_ref', true), ''),
      (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create trigger log_inventory_change after insert or update of on_hand on public.inventory
  for each row execute function private.log_inventory_change();

-- Staff stock adjustment with an explicit reason (used by the admin panel).
create or replace function public.adjust_inventory(p_variant_id uuid, p_delta integer, p_reason text, p_ref text default null)
returns public.inventory
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.inventory;
begin
  if not (private.is_trusted() or private.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_reason not in ('restock', 'return', 'adjustment', 'damage') then
    raise exception 'invalid reason %', p_reason using errcode = '22023';
  end if;
  perform set_config('app.inventory_reason', p_reason, true);
  perform set_config('app.inventory_ref', coalesce(p_ref, ''), true);

  insert into public.inventory as i (variant_id, on_hand)
  values (p_variant_id, greatest(p_delta, 0))
  on conflict (variant_id) do update
    set on_hand = i.on_hand + p_delta
  returning * into v_row;
  return v_row;
exception
  when check_violation then
    raise exception 'insufficient_stock' using errcode = 'P0001', detail = p_variant_id::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- place_order: creates a pending order and atomically reserves stock.
-- Pricing is computed by the server (src/lib/commerce, unit tested) from DB prices;
-- this function re-validates prices against the catalog so a bug upstream cannot sell
-- below the listed price.
--
-- p_order: { email, phone?, user_id?, locale, vat_mode, subtotal_ore, discount_ore,
--            shipping_ore, tax_ore, total_ore, discount_code?, shipping_rate_code,
--            shipping_address, billing_address?, payment_provider, cart_id? }
-- p_items: [{ variant_id, qty, unit_price_ore, discount_ore, line_total_ore,
--             vat_rate_bp, tax_ore, bundle_group?, bundle_discount_bp? }]
-- ---------------------------------------------------------------------------
create or replace function public.place_order(p_order jsonb, p_items jsonb, p_reservation_minutes integer default 20)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_list_price integer;
  v_expected_unit integer;
  v_updated integer;
  v_drop record;
  v_already integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order' using errcode = '22023';
  end if;
  if p_reservation_minutes not between 5 and 60 then
    raise exception 'invalid reservation window' using errcode = '22023';
  end if;

  insert into public.orders (
    user_id, email, phone, locale, vat_mode, subtotal_ore, discount_ore, shipping_ore, tax_ore,
    total_ore, discount_code, shipping_rate_code, shipping_address, billing_address, payment_provider
  ) values (
    nullif(p_order->>'user_id', '')::uuid,
    p_order->>'email',
    nullif(p_order->>'phone', ''),
    coalesce(p_order->>'locale', 'nb')::public.locale,
    coalesce(p_order->>'vat_mode', 'domestic')::public.vat_mode,
    (p_order->>'subtotal_ore')::integer,
    coalesce((p_order->>'discount_ore')::integer, 0),
    coalesce((p_order->>'shipping_ore')::integer, 0),
    (p_order->>'tax_ore')::integer,
    (p_order->>'total_ore')::integer,
    nullif(p_order->>'discount_code', ''),
    p_order->>'shipping_rate_code',
    p_order->'shipping_address',
    p_order->'billing_address',
    (p_order->>'payment_provider')::public.payment_provider
  ) returning * into v_order;

  -- Lock variants in a stable order to avoid deadlocks between concurrent checkouts.
  for v_item in
    select value from jsonb_array_elements(p_items) order by value->>'variant_id'
  loop
    v_qty := (v_item->>'qty')::integer;

    select v.id, v.sku, v.size, v.color_name, v.price_ore as variant_price, v.is_active,
           p.id as product_id, p.name, p.price_ore as product_price, p.status, p.drop_id
      into v_variant
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = (v_item->>'variant_id')::uuid;

    if not found or not v_variant.is_active or v_variant.status <> 'active' then
      raise exception 'variant_unavailable' using errcode = 'P0001', detail = v_item->>'variant_id';
    end if;

    -- Drops: not purchasable before start / after end; enforce per-customer cap.
    if v_variant.drop_id is not null then
      select * into v_drop from public.drops d where d.id = v_variant.drop_id;
      if now() < v_drop.starts_at or (v_drop.ends_at is not null and now() > v_drop.ends_at) then
        raise exception 'drop_not_live' using errcode = 'P0001', detail = v_variant.drop_id::text;
      end if;
      if v_drop.max_per_customer is not null then
        select coalesce(sum(oi.qty), 0) into v_already
          from public.order_items oi
          join public.orders o on o.id = oi.order_id
          join public.products p2 on p2.id = oi.product_id
         where p2.drop_id = v_drop.id
           and o.email = v_order.email
           and o.status not in ('cancelled', 'expired', 'refunded');
        if v_already + v_qty > v_drop.max_per_customer then
          raise exception 'drop_limit_exceeded' using errcode = 'P0001', detail = v_drop.id::text;
        end if;
      end if;
    end if;

    v_list_price := coalesce(v_variant.variant_price, v_variant.product_price);
    v_expected_unit := (v_item->>'unit_price_ore')::integer;
    if v_expected_unit <> v_list_price then
      raise exception 'price_mismatch' using errcode = 'P0001', detail = v_item->>'variant_id';
    end if;

    -- The race-free reservation: a single conditional UPDATE. Two buyers of the last unit
    -- serialise on the row lock; the second sees available < qty and gets 0 rows.
    update public.inventory
       set reserved = reserved + v_qty
     where variant_id = v_variant.id
       and on_hand - reserved >= v_qty;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'insufficient_stock' using errcode = 'P0001', detail = v_variant.id::text;
    end if;

    insert into public.inventory_reservations (variant_id, order_id, qty, expires_at)
    values (v_variant.id, v_order.id, v_qty, now() + make_interval(mins => p_reservation_minutes));

    insert into public.order_items (
      order_id, product_id, variant_id, sku, name, variant_label, qty, unit_price_ore,
      discount_ore, line_total_ore, vat_rate_bp, tax_ore, bundle_group
    ) values (
      v_order.id, v_variant.product_id, v_variant.id, v_variant.sku,
      coalesce(v_variant.name->>(v_order.locale::text), v_variant.name->>'nb'),
      coalesce(v_variant.color_name->>(v_order.locale::text), v_variant.color_name->>'nb') || ' / ' || v_variant.size,
      v_qty, v_expected_unit,
      coalesce((v_item->>'discount_ore')::integer, 0),
      (v_item->>'line_total_ore')::integer,
      (v_item->>'vat_rate_bp')::integer,
      (v_item->>'tax_ore')::integer,
      nullif(v_item->>'bundle_group', '')::uuid
    );
  end loop;

  -- Totals must reconcile with the lines (defence in depth against pricing bugs).
  if v_order.subtotal_ore <> (select sum(unit_price_ore * qty) from public.order_items where order_id = v_order.id)
     or v_order.discount_ore <> (select sum(discount_ore) from public.order_items where order_id = v_order.id) then
    raise exception 'totals_mismatch' using errcode = 'P0001';
  end if;

  if p_order ? 'cart_id' then
    update public.carts set converted_order_id = v_order.id where id = (p_order->>'cart_id')::uuid;
  end if;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Releasing stock (payment failed, cancelled, or reservation expired)
-- ---------------------------------------------------------------------------
create or replace function public.release_order(p_order_id uuid, p_status public.order_status default 'cancelled')
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_res record;
begin
  if p_status not in ('cancelled', 'expired') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pending' then
    return v_order; -- idempotent: paid or already released orders are untouched
  end if;

  for v_res in
    select * from public.inventory_reservations
     where order_id = p_order_id and status = 'active'
     order by variant_id
     for update
  loop
    update public.inventory set reserved = reserved - v_res.qty where variant_id = v_res.variant_id;
    update public.inventory_reservations set status = 'released' where id = v_res.id;
  end loop;

  update public.orders set status = p_status, cancelled_at = now()
   where id = p_order_id
   returning * into v_order;
  return v_order;
end;
$$;

create or replace function public.release_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_count integer := 0;
begin
  for v_order_id in
    select distinct r.order_id
      from public.inventory_reservations r
      join public.orders o on o.id = r.order_id
     where r.status = 'active' and r.expires_at < now() and o.status = 'pending'
  loop
    perform public.release_order(v_order_id, 'expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_order_paid: called from verified payment webhooks. Idempotent.
-- Returns true only the first time (so emails are sent exactly once).
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_provider public.payment_provider,
  p_provider_ref text,
  p_amount_ore integer,
  p_raw jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_res record;
  v_discount public.discounts;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  insert into public.payments (order_id, provider, provider_ref, status, amount_ore, raw)
  values (p_order_id, p_provider, p_provider_ref, 'captured', p_amount_ore, p_raw)
  on conflict (provider, provider_ref) do update
    set status = 'captured', amount_ore = excluded.amount_ore, raw = coalesce(excluded.raw, public.payments.raw);

  if v_order.status <> 'pending' and v_order.status <> 'expired' then
    return false; -- already processed
  end if;

  if p_amount_ore <> v_order.total_ore then
    raise exception 'amount_mismatch' using errcode = 'P0001',
      detail = format('expected %s got %s', v_order.total_ore, p_amount_ore);
  end if;

  if v_order.status = 'expired' then
    -- Payment landed after the reservation expired. Re-reserve if stock allows;
    -- otherwise the order is flagged for manual refund by staff.
    perform 1
      from (select variant_id, sum(qty) as qty from public.order_items
             where order_id = p_order_id group by variant_id) need
      join public.inventory i on i.variant_id = need.variant_id
     where i.on_hand - i.reserved < need.qty;
    if found then
      update public.orders set notes = concat_ws(E'\n', notes, 'PAID AFTER EXPIRY, OUT OF STOCK: refund required')
       where id = p_order_id;
      return false;
    end if;
    insert into public.inventory_reservations (variant_id, order_id, qty, expires_at)
    select oi.variant_id, oi.order_id, oi.qty, now() from public.order_items oi where oi.order_id = p_order_id;
    update public.inventory i set reserved = i.reserved + need.qty
      from (select variant_id, sum(qty) as qty from public.order_items
             where order_id = p_order_id group by variant_id) need
     where i.variant_id = need.variant_id;
  end if;

  perform set_config('app.inventory_reason', 'sale', true);
  perform set_config('app.inventory_ref', v_order.number::text, true);
  for v_res in
    select * from public.inventory_reservations
     where order_id = p_order_id and status = 'active'
     order by variant_id
     for update
  loop
    update public.inventory
       set on_hand = on_hand - v_res.qty, reserved = reserved - v_res.qty
     where variant_id = v_res.variant_id;
    update public.inventory_reservations set status = 'committed' where id = v_res.id;
  end loop;

  if v_order.discount_code is not null then
    select * into v_discount from public.discounts where code = v_order.discount_code for update;
    if found then
      update public.discounts set times_used = times_used + 1 where id = v_discount.id;
      insert into public.discount_redemptions (discount_id, order_id, email, user_id)
      values (v_discount.id, p_order_id, v_order.email, v_order.user_id)
      on conflict do nothing;
    end if;
  end if;

  update public.orders
     set status = 'paid', paid_at = now(), payment_provider = p_provider
   where id = p_order_id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Webhook idempotency: returns true if this event has not been processed yet.
-- ---------------------------------------------------------------------------
create or replace function public.claim_webhook_event(p_provider text, p_event_id text, p_type text, p_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_processed timestamptz;
begin
  insert into public.webhook_events (provider, event_id, event_type, payload, attempts)
  values (p_provider, p_event_id, p_type, p_payload, 1)
  on conflict (provider, event_id) do update set attempts = public.webhook_events.attempts + 1
  returning processed_at into v_processed;
  return v_processed is null;
end;
$$;

create or replace function public.complete_webhook_event(p_provider text, p_event_id text, p_error text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.webhook_events
     set processed_at = case when p_error is null then now() else null end,
         last_error = p_error
   where provider = p_provider and event_id = p_event_id
$$;

-- ---------------------------------------------------------------------------
-- Discount validation (server calls this; codes are not readable by clients).
-- ---------------------------------------------------------------------------
create or replace function public.lookup_discount(p_code text, p_email text default null)
returns public.discounts
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.discounts;
  v_used integer;
begin
  select * into v from public.discounts
   where code = p_code::extensions.citext and is_active
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at > now())
     and (usage_limit is null or times_used < usage_limit);
  if not found then
    return null;
  end if;
  if v.per_customer_limit is not null and p_email is not null then
    select count(*) into v_used from public.discount_redemptions
     where discount_id = v.id and email = p_email::extensions.citext;
    if v_used >= v.per_customer_limit then
      return null;
    end if;
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Returns / angrerett (customer-callable). Enforces ownership and the return window.
-- ---------------------------------------------------------------------------
create or replace function public.request_return(p_order_id uuid, p_items jsonb, p_reason text default null)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_window integer;
  v_return public.returns;
  v_item jsonb;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.user_id is distinct from (select auth.uid()) then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.status not in ('paid', 'fulfilled', 'shipped', 'delivered', 'partially_refunded') then
    raise exception 'not_returnable' using errcode = 'P0001';
  end if;

  select coalesce((value #>> '{}')::integer, 14) into v_window
    from public.store_settings where key = 'return_window_days';
  v_window := greatest(coalesce(v_window, 14), 14); -- never below the statutory 14 days

  if v_order.delivered_at is not null and v_order.delivered_at + make_interval(days => v_window) < now() then
    raise exception 'return_window_closed' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'no_items' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    perform 1 from public.order_items oi
     where oi.id = (v_item->>'order_item_id')::uuid
       and oi.order_id = p_order_id
       and (v_item->>'qty')::integer between 1 and oi.qty;
    if not found then
      raise exception 'invalid_item' using errcode = '22023';
    end if;
  end loop;

  insert into public.returns (order_id, user_id, reason, items)
  values (p_order_id, (select auth.uid()), left(p_reason, 2000), p_items)
  returning * into v_return;
  return v_return;
end;
$$;

-- ---------------------------------------------------------------------------
-- Search: Postgres full-text with trigram fallback for typos. RLS applies (invoker).
-- ---------------------------------------------------------------------------
create or replace function public.search_products(p_query text, p_limit integer default 24)
returns setof public.products
language sql
stable
set search_path = ''
as $$
  with q as (
    select
      websearch_to_tsquery('norwegian'::regconfig, p_query) ||
      websearch_to_tsquery('english'::regconfig, p_query) as tsq,
      lower(p_query) as raw
  )
  select p.*
    from public.products p, q
   where p.status = 'active'
     and (
       p.search @@ q.tsq
       or extensions.similarity(coalesce(p.name->>'nb', '') || ' ' || coalesce(p.name->>'en', ''), q.raw) > 0.2
     )
   order by
     ts_rank_cd(p.search, q.tsq) desc,
     extensions.similarity(coalesce(p.name->>'nb', '') || ' ' || coalesce(p.name->>'en', ''), q.raw) desc,
     p.position
   limit least(greatest(p_limit, 1), 50)
$$;

-- ---------------------------------------------------------------------------
-- Privileges: money-moving functions are server-only.
-- ---------------------------------------------------------------------------
revoke all on function public.place_order(jsonb, jsonb, integer) from public, anon, authenticated;
revoke all on function public.release_order(uuid, public.order_status) from public, anon, authenticated;
revoke all on function public.release_expired_reservations() from public, anon, authenticated;
revoke all on function public.mark_order_paid(uuid, public.payment_provider, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.claim_webhook_event(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.complete_webhook_event(text, text, text) from public, anon, authenticated;
revoke all on function public.lookup_discount(text, text) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, integer) to service_role;
grant execute on function public.release_order(uuid, public.order_status) to service_role;
grant execute on function public.release_expired_reservations() to service_role;
grant execute on function public.mark_order_paid(uuid, public.payment_provider, text, integer, jsonb) to service_role;
grant execute on function public.claim_webhook_event(text, text, text, jsonb) to service_role;
grant execute on function public.complete_webhook_event(text, text, text) to service_role;
grant execute on function public.lookup_discount(text, text) to service_role;

revoke all on function public.adjust_inventory(uuid, integer, text, text) from public, anon;
grant execute on function public.adjust_inventory(uuid, integer, text, text) to authenticated, service_role;

revoke all on function public.request_return(uuid, jsonb, text) from public, anon;
grant execute on function public.request_return(uuid, jsonb, text) to authenticated;

grant execute on function public.search_products(text, integer) to anon, authenticated;
