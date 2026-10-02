-- Phase 4: checkout.
-- 1) 'test' payment provider for preview/CI purchase flows (the app never offers it in production).
-- 2) place_order validates export prices (MVA stripped for orders shipped outside Norway).
-- 3) confirm_order_payment records authorised vs captured payments. Norwegian practice is to
--    reserve at checkout and capture when the goods ship, so Vipps and Stripe both authorise.

alter type public.payment_provider add value if not exists 'test';

-- The cart an order came from. The cart is only marked converted once payment succeeds, so a
-- customer who cancels in Vipps/Stripe comes back to their cart intact.
alter table public.orders add column if not exists cart_id uuid references public.carts (id) on delete set null;
create index if not exists orders_cart_idx on public.orders (cart_id);

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
    total_ore, discount_code, shipping_rate_code, shipping_address, billing_address, payment_provider,
    cart_id
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
    (p_order->>'payment_provider')::public.payment_provider,
    nullif(p_order->>'cart_id', '')::uuid
  ) returning * into v_order;

  for v_item in
    select value from jsonb_array_elements(p_items) order by value->>'variant_id', value->>'bundle_group'
  loop
    v_qty := (v_item->>'qty')::integer;

    select v.id, v.sku, v.size, v.color_name, v.price_ore as variant_price, v.is_active,
           p.id as product_id, p.name, p.price_ore as product_price, p.vat_rate_bp, p.status, p.drop_id
      into v_variant
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = (v_item->>'variant_id')::uuid;

    if not found or not v_variant.is_active or v_variant.status <> 'active' then
      raise exception 'variant_unavailable' using errcode = 'P0001', detail = v_item->>'variant_id';
    end if;

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

    -- Gross list price; exports are zero-rated so the unit price is the net price.
    -- Rounding must match src/lib/commerce/tax.ts (half up).
    v_list_price := coalesce(v_variant.variant_price, v_variant.product_price);
    if v_order.vat_mode = 'export' then
      v_list_price := v_list_price - round(v_list_price::numeric * v_variant.vat_rate_bp / (10000 + v_variant.vat_rate_bp))::integer;
    end if;
    v_expected_unit := (v_item->>'unit_price_ore')::integer;
    if v_expected_unit <> v_list_price then
      raise exception 'price_mismatch' using errcode = 'P0001', detail = v_item->>'variant_id';
    end if;

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

  if v_order.subtotal_ore <> (select sum(unit_price_ore * qty) from public.order_items where order_id = v_order.id)
     or v_order.discount_ore <> (select sum(discount_ore) from public.order_items where order_id = v_order.id) then
    raise exception 'totals_mismatch' using errcode = 'P0001';
  end if;

  return v_order;
end;
$$;

-- Records a successful authorisation or capture. Idempotent; returns true only the first time
-- the order becomes paid (so confirmation emails go out exactly once).
create or replace function public.confirm_order_payment(
  p_order_id uuid,
  p_provider public.payment_provider,
  p_provider_ref text,
  p_amount_ore integer,
  p_payment_status public.payment_status default 'authorized',
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
  if p_payment_status not in ('authorized', 'captured') then
    raise exception 'invalid payment status' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  insert into public.payments (order_id, provider, provider_ref, status, amount_ore, raw)
  values (p_order_id, p_provider, p_provider_ref, p_payment_status, p_amount_ore, p_raw)
  on conflict (provider, provider_ref) do update
    set status = case
          when public.payments.status = 'captured' then public.payments.status
          else excluded.status
        end,
        amount_ore = excluded.amount_ore,
        raw = coalesce(excluded.raw, public.payments.raw);

  if v_order.status <> 'pending' and v_order.status <> 'expired' then
    return false;
  end if;

  if p_amount_ore <> v_order.total_ore then
    raise exception 'amount_mismatch' using errcode = 'P0001',
      detail = format('expected %s got %s', v_order.total_ore, p_amount_ore);
  end if;

  if v_order.status = 'expired' then
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
  if v_order.cart_id is not null then
    update public.carts set converted_order_id = p_order_id where id = v_order.cart_id;
  end if;
  return true;
end;
$$;

-- Backwards-compatible wrapper (captured immediately).
create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_provider public.payment_provider,
  p_provider_ref text,
  p_amount_ore integer,
  p_raw jsonb default null
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.confirm_order_payment(p_order_id, p_provider, p_provider_ref, p_amount_ore, 'captured', p_raw)
$$;

revoke all on function public.confirm_order_payment(uuid, public.payment_provider, text, integer, public.payment_status, jsonb)
  from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, public.payment_provider, text, integer, public.payment_status, jsonb)
  to service_role;
