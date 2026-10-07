-- OnlyPants v1 schema. See docs/PRD.md §7 (stock) and §9 (data model).
-- All tables are accessed only by the Next.js server (postgres role). RLS is
-- enabled with no policies so the anon/authenticated API roles cannot read them.

create extension if not exists pg_cron;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type product_type as enum ('thrift', 'merch');
create type product_status as enum ('draft', 'active', 'archived');
create type order_status as enum (
  'awaiting_quote',    -- menunggu ongkir
  'awaiting_payment',  -- menunggu pembayaran
  'payment_review',    -- verifikasi pembayaran
  'paid',
  'processing',
  'shipped',
  'completed',
  'cancelled',
  'expired'
);
create type stock_movement_type as enum ('restock', 'adjust', 'reserve', 'release', 'sale', 'return');
create type staff_role as enum ('owner', 'staff');
create type proof_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------- catalog
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_id text not null,
  name_en text not null,
  sort int not null default 0
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type product_type not null,
  category_id uuid not null references categories(id),
  name_id text not null,
  name_en text not null,
  description_id text not null default '',
  description_en text not null default '',
  price int not null check (price >= 0),                       -- rupiah
  compare_at_price int check (compare_at_price is null or compare_at_price > price),
  condition_score int check (condition_score between 1 and 10), -- thrift only
  condition_note_id text not null default '',
  condition_note_en text not null default '',
  measurements jsonb not null default '{}'::jsonb,              -- cm, e.g. {"waist":82,"length":104}
  status product_status not null default 'draft',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_status_idx on products (status, created_at desc);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt text not null default '',
  sort int not null default 0
);
create index product_images_product_idx on product_images (product_id, sort);

create table variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size_label text not null,
  sku text unique,
  sort int not null default 0,
  stock_on_hand int not null default 0,
  reserved int not null default 0,
  constraint variants_stock_ck check (reserved >= 0 and stock_on_hand >= 0 and reserved <= stock_on_hand),
  unique (product_id, size_label)
);

-- ---------------------------------------------------------------- staff
create table staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role staff_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 -- OP-YYMMDD-XXXX
  access_token_hash text not null,           -- sha256 of the token in the order URL
  status order_status not null default 'awaiting_quote',
  locale text not null default 'id' check (locale in ('id', 'en')),
  customer_name text not null,
  email text not null,
  phone text not null,                       -- normalized 62xxxxxxxx
  address jsonb not null,                    -- {line, district, city, province, postal_code}
  note text not null default '',
  subtotal int not null check (subtotal >= 0),
  shipping_cost int check (shipping_cost >= 0),
  courier text,
  unique_code int check (unique_code between 1 and 999),
  total int check (total >= 0),
  quote_deadline timestamptz not null,       -- created_at + 48h
  shipping_quoted_at timestamptz,
  payment_deadline timestamptz,              -- shipping_quoted_at + 24h
  paid_at timestamptz,
  tracking_number text,
  shipped_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  internal_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on orders (status, created_at desc);
-- one unique code per order that is still waiting for money, so transfers can be matched
create unique index orders_active_unique_code_idx on orders (unique_code)
  where status in ('awaiting_payment', 'payment_review');

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid not null references variants(id),
  product_id uuid not null references products(id),
  product_name text not null,                -- snapshot at checkout
  size_label text not null,
  image_url text,
  unit_price int not null,
  qty int not null check (qty > 0)
);
create index order_items_order_idx on order_items (order_id);

create table payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  storage_path text not null,
  status proof_status not null default 'pending',
  review_note text,
  reviewed_by uuid references staff(user_id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index payment_proofs_order_idx on payment_proofs (order_id, created_at desc);

create table order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete cascade,
  status order_status,
  message text not null,
  actor_id uuid references staff(user_id),
  created_at timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id, created_at);

create table stock_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references variants(id) on delete cascade,
  type stock_movement_type not null,
  qty int not null,                          -- signed delta on the affected column
  order_id uuid references orders(id) on delete set null,
  actor_id uuid references staff(user_id),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index stock_movements_variant_idx on stock_movements (variant_id, created_at desc);

-- ---------------------------------------------------------------- misc
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references staff(user_id),
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table notifications_log (
  id bigint generated always as identity primary key,
  order_id uuid references orders(id) on delete cascade,
  channel text not null,                     -- email | whatsapp
  event text not null,
  recipient text not null,
  status text not null,                      -- sent | failed | skipped
  error text,
  created_at timestamptz not null default now()
);

create table rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);

-- ---------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array['categories','products','product_images','variants','staff','orders',
    'order_items','payment_proofs','order_events','stock_movements','settings','contact_messages',
    'audit_logs','notifications_log','rate_limits']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- stock functions
-- Release every reservation held by an order and move it to a terminal status.
-- Idempotent: only acts while the order still holds stock.
create or replace function release_order(p_order_id uuid, p_status order_status, p_reason text, p_actor uuid default null)
returns boolean language plpgsql as $$
declare it record;
begin
  perform 1 from orders
    where id = p_order_id and status in ('awaiting_quote', 'awaiting_payment', 'payment_review')
    for update;
  if not found then return false; end if;

  for it in select variant_id, qty from order_items where order_id = p_order_id loop
    update variants set reserved = reserved - it.qty where id = it.variant_id;
    insert into stock_movements (variant_id, type, qty, order_id, actor_id, note)
      values (it.variant_id, 'release', -it.qty, p_order_id, p_actor, p_reason);
  end loop;

  update orders set status = p_status, cancelled_at = now(), cancel_reason = p_reason, updated_at = now()
    where id = p_order_id;
  insert into order_events (order_id, status, message, actor_id) values (p_order_id, p_status, p_reason, p_actor);
  return true;
end $$;

-- Turn the reservation into a sale once payment is approved. Admins may also
-- approve from awaiting_payment when the customer sent proof outside the site (e.g. WhatsApp).
create or replace function commit_order(p_order_id uuid, p_actor uuid)
returns boolean language plpgsql as $$
declare it record;
begin
  perform 1 from orders where id = p_order_id and status in ('awaiting_payment', 'payment_review') for update;
  if not found then return false; end if;

  for it in select variant_id, qty from order_items where order_id = p_order_id loop
    update variants set reserved = reserved - it.qty, stock_on_hand = stock_on_hand - it.qty
      where id = it.variant_id;
    insert into stock_movements (variant_id, type, qty, order_id, actor_id, note)
      values (it.variant_id, 'sale', -it.qty, p_order_id, p_actor, 'payment approved');
  end loop;

  update orders set status = 'paid', paid_at = now(), updated_at = now() where id = p_order_id;
  insert into order_events (order_id, status, message, actor_id)
    values (p_order_id, 'paid', 'payment approved', p_actor);
  return true;
end $$;

-- Periodic sweep: quote timeout (48h), payment timeout (24h), auto-complete shipped orders (14d).
create or replace function sweep_orders()
returns int language plpgsql as $$
declare r record; n int := 0;
begin
  for r in select id from orders where status = 'awaiting_quote' and quote_deadline < now() loop
    if release_order(r.id, 'cancelled', 'quote_timeout') then n := n + 1; end if;
  end loop;
  for r in select id from orders where status = 'awaiting_payment' and payment_deadline < now() loop
    if release_order(r.id, 'expired', 'payment_timeout') then n := n + 1; end if;
  end loop;
  update orders set status = 'completed', completed_at = now(), updated_at = now()
    where status = 'shipped' and shipped_at < now() - interval '14 days';
  return n;
end $$;

select cron.schedule('sweep-orders', '*/10 * * * *', 'select sweep_orders()');

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', true),
  ('payment-proofs', 'payment-proofs', false),
  ('store-assets', 'store-assets', true)
on conflict (id) do nothing;
