-- Core schema: catalog, inventory, drops, carts, orders, customers, content.
-- Money is always integer øre (1 NOK = 100 øre). Catalog prices are GROSS (incl. MVA).
-- Localised text is jsonb shaped as {"nb": "...", "en": "..."}; nb is required.

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('customer', 'staff', 'admin');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum (
  'pending', 'paid', 'fulfilled', 'shipped', 'delivered',
  'cancelled', 'expired', 'refunded', 'partially_refunded'
);
create type public.payment_provider as enum ('stripe', 'vipps');
create type public.payment_status as enum (
  'pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded'
);
create type public.vat_mode as enum ('domestic', 'export');
create type public.reservation_status as enum ('active', 'committed', 'released');
create type public.discount_kind as enum ('percent', 'fixed', 'free_shipping');
create type public.waitlist_kind as enum ('drop', 'back_in_stock');
create type public.return_status as enum ('requested', 'approved', 'received', 'refunded', 'rejected');
create type public.review_status as enum ('pending', 'published', 'rejected');
create type public.locale as enum ('nb', 'en');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- jsonb localised text must contain a non-empty nb value.
create or replace function private.is_i18n(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and jsonb_typeof(value) = 'object'
    and coalesce(length(value->>'nb'), 0) > 0
$$;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text check (length(full_name) <= 200),
  locale public.locale not null default 'nb',
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text check (length(label) <= 60),
  full_name text not null check (length(full_name) between 1 and 200),
  line1 text not null check (length(line1) between 1 and 200),
  line2 text check (length(line2) <= 200),
  postal_code text not null check (length(postal_code) between 2 and 12),
  city text not null check (length(city) between 1 and 120),
  country char(2) not null default 'NO' check (country ~ '^[A-Z]{2}$'),
  phone text check (phone ~ '^\+?[0-9 ]{6,20}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status public.product_status not null default 'draft',
  name jsonb not null check (private.is_i18n(name)),
  description jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name jsonb not null check (private.is_i18n(name)),
  description jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz,
  max_per_customer integer check (max_per_customer > 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status public.product_status not null default 'draft',
  name jsonb not null check (private.is_i18n(name)),
  tagline jsonb,
  description jsonb,
  collection_id uuid references public.collections (id) on delete set null,
  drop_id uuid references public.drops (id) on delete set null,
  price_ore integer not null check (price_ore >= 0),
  compare_at_ore integer check (compare_at_ore is null or compare_at_ore > price_ore),
  vat_rate_bp integer not null default 2500 check (vat_rate_bp between 0 and 10000),
  materials jsonb not null default '[]'::jsonb check (jsonb_typeof(materials) = 'array'),
  specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  -- Parameters for the procedural 3D band (width, thickness, twist, finish).
  form jsonb not null default '{}'::jsonb check (jsonb_typeof(form) = 'object'),
  seo jsonb,
  is_limited boolean not null default false,
  position integer not null default 0,
  published_at timestamptz,
  search tsvector generated always as (
    setweight(to_tsvector('norwegian'::regconfig, coalesce(name->>'nb', '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(name->>'en', '')), 'A') ||
    setweight(to_tsvector('norwegian'::regconfig, coalesce(tagline->>'nb', '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(tagline->>'en', '')), 'B') ||
    setweight(to_tsvector('norwegian'::regconfig, coalesce(description->>'nb', '')), 'C') ||
    setweight(to_tsvector('english'::regconfig, coalesce(description->>'en', '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_status_idx on public.products (status, position);
create index products_collection_idx on public.products (collection_id);
create index products_drop_idx on public.products (drop_id);
create index products_search_idx on public.products using gin (search);
create index products_name_trgm_idx on public.products
  using gin ((coalesce(name->>'nb', '') || ' ' || coalesce(name->>'en', '')) extensions.gin_trgm_ops);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique check (sku ~ '^[A-Z0-9-]{3,40}$'),
  color_key text not null check (color_key ~ '^[a-z0-9-]{2,30}$'),
  color_name jsonb not null check (private.is_i18n(color_name)),
  color_hex text not null check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  size text not null check (length(size) between 1 and 12),
  price_ore integer check (price_ore >= 0),
  weight_g integer check (weight_g > 0),
  barcode text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, color_key, size)
);
create index product_variants_product_idx on public.product_variants (product_id, position);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  kind text not null default 'image' check (kind in ('image', 'video', 'model')),
  url text not null check (length(url) <= 1000),
  alt jsonb not null check (private.is_i18n(alt)),
  width integer check (width > 0),
  height integer check (height > 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_media_product_idx on public.product_media (product_id, position);
create index product_media_variant_idx on public.product_media (variant_id);

create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status public.product_status not null default 'draft',
  name jsonb not null check (private.is_i18n(name)),
  description jsonb,
  discount_bp integer not null check (discount_bp between 1 and 5000),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bundle_items (
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  qty integer not null default 1 check (qty between 1 and 10),
  primary key (bundle_id, product_id)
);
create index bundle_items_product_idx on public.bundle_items (product_id);

-- ---------------------------------------------------------------------------
-- Inventory. `available` is what the storefront shows and what checkout reserves against.
-- ---------------------------------------------------------------------------
create table public.inventory (
  variant_id uuid primary key references public.product_variants (id) on delete cascade,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  available integer generated always as (on_hand - reserved) stored,
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(),
  check (reserved <= on_hand)
);

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('restock', 'sale', 'return', 'adjustment', 'damage', 'initial')),
  ref text,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Waitlists (drops and back-in-stock)
-- ---------------------------------------------------------------------------
create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  kind public.waitlist_kind not null,
  drop_id uuid references public.drops (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  email extensions.citext not null check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  user_id uuid references auth.users (id) on delete set null,
  locale public.locale not null default 'nb',
  consent_at timestamptz not null default now(),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (kind = 'drop' and drop_id is not null and variant_id is null) or
    (kind = 'back_in_stock' and variant_id is not null and drop_id is null)
  ),
  unique nulls not distinct (kind, drop_id, variant_id, email)
);
create index waitlist_pending_variant_idx on public.waitlist_entries (variant_id) where notified_at is null;
create index waitlist_pending_drop_idx on public.waitlist_entries (drop_id) where notified_at is null;
create index waitlist_user_idx on public.waitlist_entries (user_id);

-- ---------------------------------------------------------------------------
-- Pricing rules
-- ---------------------------------------------------------------------------
create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext not null unique check (code ~ '^[A-Za-z0-9_-]{3,40}$'),
  kind public.discount_kind not null,
  -- percent: basis points (1000 = 10 %). fixed: øre. free_shipping: ignored.
  value integer not null default 0 check (value >= 0),
  min_subtotal_ore integer not null default 0 check (min_subtotal_ore >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit > 0),
  per_customer_limit integer check (per_customer_limit > 0),
  times_used integer not null default 0 check (times_used >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'percent' or value between 1 and 10000)
);

create table public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  carrier text not null check (carrier in ('bring', 'posten', 'pickup')),
  name jsonb not null check (private.is_i18n(name)),
  zone text not null check (zone in ('NO', 'NORDIC', 'EU', 'WORLD')),
  price_ore integer not null check (price_ore >= 0),
  free_over_ore integer check (free_over_ore >= 0),
  eta_days_min integer not null check (eta_days_min >= 0),
  eta_days_max integer not null check (eta_days_max >= eta_days_min),
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Carts. Anonymous carts are addressed by a hashed cookie token and only touched server-side.
-- ---------------------------------------------------------------------------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  token_hash text unique check (length(token_hash) = 64),
  email extensions.citext,
  locale public.locale not null default 'nb',
  country char(2) not null default 'NO' check (country ~ '^[A-Z]{2}$'),
  discount_code extensions.citext,
  abandoned_email_sent_at timestamptz,
  converted_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or token_hash is not null)
);
create index carts_user_idx on public.carts (user_id);
create index carts_abandoned_idx on public.carts (updated_at)
  where converted_order_id is null and abandoned_email_sent_at is null and email is not null;

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  qty integer not null check (qty between 1 and 10),
  bundle_id uuid references public.bundles (id) on delete set null,
  -- Items added together as one bundle share a group id.
  bundle_group uuid,
  created_at timestamptz not null default now(),
  unique nulls not distinct (cart_id, variant_id, bundle_group)
);
create index cart_items_cart_idx on public.cart_items (cart_id);

-- ---------------------------------------------------------------------------
-- Orders and payments
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq start with 100001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.order_number_seq'),
  user_id uuid references auth.users (id) on delete set null,
  email extensions.citext not null,
  phone text,
  status public.order_status not null default 'pending',
  locale public.locale not null default 'nb',
  currency char(3) not null default 'NOK' check (currency = 'NOK'),
  vat_mode public.vat_mode not null default 'domestic',
  subtotal_ore integer not null check (subtotal_ore >= 0),
  discount_ore integer not null default 0 check (discount_ore >= 0),
  shipping_ore integer not null default 0 check (shipping_ore >= 0),
  tax_ore integer not null check (tax_ore >= 0),
  total_ore integer not null check (total_ore >= 0),
  discount_code extensions.citext,
  shipping_rate_code text,
  shipping_address jsonb not null,
  billing_address jsonb,
  payment_provider public.payment_provider,
  carrier text,
  tracking_number text,
  tracking_url text,
  notes text,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_ore = subtotal_ore - discount_ore + shipping_ore),
  check (discount_ore <= subtotal_ore)
);
alter sequence public.order_number_seq owned by public.orders.number;
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_email_idx on public.orders (email);

alter table public.carts
  add constraint carts_converted_order_fk foreign key (converted_order_id)
  references public.orders (id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  sku text not null,
  name text not null,
  variant_label text not null,
  qty integer not null check (qty between 1 and 10),
  unit_price_ore integer not null check (unit_price_ore >= 0),
  discount_ore integer not null default 0 check (discount_ore >= 0),
  line_total_ore integer not null check (line_total_ore >= 0),
  vat_rate_bp integer not null check (vat_rate_bp between 0 and 10000),
  tax_ore integer not null check (tax_ore >= 0),
  bundle_group uuid,
  created_at timestamptz not null default now(),
  check (line_total_ore = unit_price_ore * qty - discount_ore)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  qty integer not null check (qty > 0),
  status public.reservation_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inventory_reservations_active_idx on public.inventory_reservations (expires_at) where status = 'active';
create index inventory_reservations_order_idx on public.inventory_reservations (order_id);
create index inventory_reservations_variant_idx on public.inventory_reservations (variant_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider public.payment_provider not null,
  provider_ref text not null,
  status public.payment_status not null default 'pending',
  amount_ore integer not null check (amount_ore >= 0),
  refunded_ore integer not null default 0 check (refunded_ore >= 0),
  currency char(3) not null default 'NOK',
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index payments_order_idx on public.payments (order_id);

-- Idempotency ledger for every inbound webhook (Stripe, Vipps, Bring).
create table public.webhook_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('stripe', 'vipps', 'bring')),
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  unique (provider, event_id)
);

create table public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  email extensions.citext not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (discount_id, order_id)
);
create index discount_redemptions_email_idx on public.discount_redemptions (discount_id, email);

-- ---------------------------------------------------------------------------
-- After-sale: returns (angrerett), wishlist, reviews
-- ---------------------------------------------------------------------------
create table public.returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  status public.return_status not null default 'requested',
  reason text check (length(reason) <= 2000),
  -- [{ "order_item_id": uuid, "qty": int }]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  refund_ore integer check (refund_ore >= 0),
  staff_notes text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);
create index returns_order_idx on public.returns (order_id);
create index returns_user_idx on public.returns (user_id);
create index returns_status_idx on public.returns (status, requested_at desc);

create table public.wishlist_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlist_items_product_idx on public.wishlist_items (product_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text check (length(title) <= 120),
  body text not null check (length(body) between 10 and 4000),
  author_name text not null check (length(author_name) between 1 and 80),
  locale public.locale not null default 'nb',
  status public.review_status not null default 'pending',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_published_idx on public.reviews (product_id, published_at desc) where status = 'published';
create index reviews_user_idx on public.reviews (user_id);
create index reviews_status_idx on public.reviews (status, created_at);

create table public.review_media (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  storage_path text not null unique check (length(storage_path) <= 500),
  width integer check (width > 0),
  height integer check (height > 0),
  created_at timestamptz not null default now()
);
create index review_media_review_idx on public.review_media (review_id);

-- ---------------------------------------------------------------------------
-- Content, settings, observability
-- ---------------------------------------------------------------------------
create table public.content_blocks (
  key text not null check (key ~ '^[a-z0-9_.-]{2,80}$'),
  locale public.locale not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (key, locale)
);

create table public.store_settings (
  key text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.email_log (
  id bigint generated always as identity primary key,
  kind text not null check (kind in (
    'order_confirmation', 'shipping_confirmation', 'abandoned_cart',
    'back_in_stock', 'drop_live', 'return_update'
  )),
  -- Idempotency: one email per (kind, ref). ref = order id, cart id, waitlist entry id …
  ref text not null,
  recipient extensions.citext not null,
  provider_id text,
  sent_at timestamptz not null default now(),
  unique (kind, ref)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'addresses', 'collections', 'drops', 'products', 'product_variants',
    'bundles', 'inventory', 'discounts', 'shipping_rates', 'carts', 'orders',
    'inventory_reservations', 'payments', 'returns', 'reviews', 'content_blocks', 'store_settings'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      t
    );
  end loop;
end;
$$;
