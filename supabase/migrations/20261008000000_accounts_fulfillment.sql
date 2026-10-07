-- Customer accounts (optional at checkout) and fulfillment proof with hand-over tracking.

-- ---------------------------------------------------------------- customers
create table customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references customers(user_id) on delete cascade,
  label text not null default '',
  recipient text not null,
  phone text not null,
  line text not null,
  district text not null,
  city text not null,
  province text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index customer_addresses_user_idx on customer_addresses (user_id);
create unique index customer_addresses_one_default on customer_addresses (user_id) where is_default;

alter table orders add column customer_id uuid references customers(user_id) on delete set null;
create index orders_customer_idx on orders (customer_id, created_at desc);

-- ---------------------------------------------------------------- fulfillment
create type fulfillment_stage as enum ('packing', 'shipping');

-- claimed_by: who pressed "start packing"; assignee_id: who is in charge right now.
alter table orders add column claimed_by uuid references staff(user_id);
alter table orders add column assignee_id uuid references staff(user_id);
create index orders_assignee_idx on orders (assignee_id) where status in ('paid', 'processing');

create table fulfillment_steps (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  stage fulfillment_stage not null,
  actor_id uuid not null references staff(user_id),
  took_over_from uuid references staff(user_id), -- set when someone else had been handling the order
  photos text[] not null default '{}',             -- paths in the private fulfillment-photos bucket
  note text not null default '',
  created_at timestamptz not null default now(),
  check (cardinality(photos) between 1 and 6)
);
create index fulfillment_steps_order_idx on fulfillment_steps (order_id, created_at);

alter table customers enable row level security;
alter table customer_addresses enable row level security;
alter table fulfillment_steps enable row level security;

insert into storage.buckets (id, name, public) values ('fulfillment-photos', 'fulfillment-photos', false)
on conflict (id) do nothing;
