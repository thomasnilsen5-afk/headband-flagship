-- Phase 5: returns from the account page.
-- Same contract as before (window from store_settings, never below the statutory 14 days),
-- plus: the order row is locked and a customer can never request back more units of an item
-- than they bought, summed over all their non-rejected return requests.
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
  v_ordered integer;
  v_requested integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
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
    select oi.qty into v_ordered from public.order_items oi
     where oi.id = (v_item->>'order_item_id')::uuid and oi.order_id = p_order_id;
    if not found or coalesce((v_item->>'qty')::integer, 0) < 1 then
      raise exception 'invalid_item' using errcode = '22023';
    end if;
    select coalesce(sum((e->>'qty')::integer), 0) into v_requested
      from public.returns r, jsonb_array_elements(r.items) e
     where r.order_id = p_order_id and r.status <> 'rejected'
       and e->>'order_item_id' = v_item->>'order_item_id';
    if v_requested + (v_item->>'qty')::integer > v_ordered then
      raise exception 'return_qty_exceeded' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.returns (order_id, user_id, reason, items)
  values (p_order_id, (select auth.uid()), nullif(left(trim(coalesce(p_reason, '')), 2000), ''), p_items)
  returning * into v_return;
  return v_return;
end;
$$;

revoke all on function public.request_return(uuid, jsonb, text) from public, anon;
grant execute on function public.request_return(uuid, jsonb, text) to authenticated;
