-- Performance advisor: cover every foreign key with an index.
-- Note: catalog tables keep a staff "for all" write policy next to the public read policy.
-- The advisor flags this as multiple permissive SELECT policies; the cost is one cached
-- private.is_staff() call per statement, accepted on purpose.
create index if not exists cart_items_bundle_idx on public.cart_items (bundle_id);
create index if not exists cart_items_variant_idx on public.cart_items (variant_id);
create index if not exists carts_converted_order_idx on public.carts (converted_order_id);
create index if not exists content_blocks_updated_by_idx on public.content_blocks (updated_by);
create index if not exists discount_redemptions_order_idx on public.discount_redemptions (order_id);
create index if not exists discount_redemptions_user_idx on public.discount_redemptions (user_id);
create index if not exists inventory_movements_actor_idx on public.inventory_movements (actor_id);
