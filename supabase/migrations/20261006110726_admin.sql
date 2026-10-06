-- Phase 5: back-office operations. The app calls these with the service role, after it has
-- (a) verified the caller is staff and (b) captured or refunded with the payment provider.
-- Each one is idempotent and writes the audit log.

-- Paid → shipped. The payment was captured just before this call (Norwegian practice: charge
-- when the goods leave). Returns false if the order was already shipped or is not shippable.
create or replace function public.mark_order_shipped(
  p_order_id uuid,
  p_carrier text,
  p_tracking_number text,
  p_tracking_url text,
  p_actor uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.status not in ('paid', 'fulfilled') then
    return false;
  end if;

  update public.payments set status = 'captured'
   where order_id = p_order_id and status = 'authorized';
  update public.orders
     set status = 'shipped', shipped_at = now(),
         carrier = nullif(trim(p_carrier), ''),
         tracking_number = nullif(trim(p_tracking_number), ''),
         tracking_url = nullif(trim(p_tracking_url), '')
   where id = p_order_id;
  insert into public.audit_log (actor_id, action, entity, entity_id, diff)
  values (p_actor, 'order.shipped', 'order', p_order_id::text,
          jsonb_build_object('carrier', p_carrier, 'tracking_number', p_tracking_number));
  return true;
end;
$$;

create or replace function public.mark_order_delivered(p_order_id uuid, p_actor uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders set status = 'delivered', delivered_at = now()
   where id = p_order_id and status = 'shipped';
  if not found then
    return false;
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id)
  values (p_actor, 'order.delivered', 'order', p_order_id::text);
  return true;
end;
$$;

-- Return workflow: requested → approved | rejected; approved → received | rejected;
-- received → refunded. Receiving puts the units back on the shelf; refunding records the
-- amount on the payment and moves the order to (partially_)refunded.
create or replace function public.set_return_status(
  p_return_id uuid,
  p_status public.return_status,
  p_refund_ore integer,
  p_actor uuid
)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_return public.returns;
  v_order public.orders;
  v_item jsonb;
  v_variant uuid;
  v_refunded integer;
begin
  select * into v_return from public.returns where id = p_return_id for update;
  if not found then
    raise exception 'return_not_found' using errcode = 'P0002';
  end if;
  if v_return.status = p_status then
    return v_return; -- idempotent repeat
  end if;
  if not (
    (v_return.status = 'requested' and p_status in ('approved', 'rejected')) or
    (v_return.status = 'approved' and p_status in ('received', 'rejected')) or
    (v_return.status = 'received' and p_status = 'refunded')
  ) then
    raise exception 'invalid_transition' using errcode = 'P0001',
      detail = format('%s -> %s', v_return.status, p_status);
  end if;

  select * into v_order from public.orders where id = v_return.order_id for update;

  if p_status = 'received' then
    perform set_config('app.inventory_reason', 'return', true);
    perform set_config('app.inventory_ref', v_order.number::text, true);
    for v_item in select value from jsonb_array_elements(v_return.items) loop
      select variant_id into v_variant from public.order_items
       where id = (v_item->>'order_item_id')::uuid;
      update public.inventory set on_hand = on_hand + (v_item->>'qty')::integer
       where variant_id = v_variant;
    end loop;
  end if;

  if p_status = 'refunded' then
    if p_refund_ore is null or p_refund_ore < 0 then
      raise exception 'refund_amount_required' using errcode = '22023';
    end if;
    select coalesce(sum(refund_ore), 0) into v_refunded
      from public.returns where order_id = v_order.id and status = 'refunded';
    if v_refunded + p_refund_ore > v_order.total_ore then
      raise exception 'refund_exceeds_total' using errcode = 'P0001';
    end if;
    update public.payments set refunded_ore = refunded_ore + p_refund_ore,
           status = case when refunded_ore + p_refund_ore >= amount_ore then 'refunded'::public.payment_status
                         else 'partially_refunded'::public.payment_status end
     where id = (select id from public.payments where order_id = v_order.id
                  and status in ('captured', 'partially_refunded') order by created_at desc limit 1);
    update public.orders
       set status = case when v_refunded + p_refund_ore >= total_ore then 'refunded'::public.order_status
                         else 'partially_refunded'::public.order_status end
     where id = v_order.id;
  end if;

  update public.returns
     set status = p_status,
         refund_ore = case when p_status = 'refunded' then p_refund_ore else refund_ore end,
         resolved_at = case when p_status in ('refunded', 'rejected') then now() else resolved_at end
   where id = p_return_id
   returning * into v_return;
  insert into public.audit_log (actor_id, action, entity, entity_id, diff)
  values (p_actor, 'return.' || p_status::text, 'return', p_return_id::text,
          jsonb_build_object('refund_ore', p_refund_ore));
  return v_return;
end;
$$;

revoke all on function public.mark_order_shipped(uuid, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.mark_order_delivered(uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_return_status(uuid, public.return_status, integer, uuid) from public, anon, authenticated;
grant execute on function public.mark_order_shipped(uuid, text, text, text, uuid) to service_role;
grant execute on function public.mark_order_delivered(uuid, uuid) to service_role;
grant execute on function public.set_return_status(uuid, public.return_status, integer, uuid) to service_role;

-- Fix: the profile role guard (and staff policies) call these helpers; without EXECUTE the
-- service role could not update profiles at all, e.g. to promote someone to staff.
grant execute on function private.has_role(public.app_role[]) to service_role;
grant execute on function private.is_staff() to service_role;
grant execute on function private.is_admin() to service_role;
