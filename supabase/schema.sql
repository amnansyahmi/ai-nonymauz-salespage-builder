-- Nonymauz Salespage Builder: database schema.
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- Sellers' working copies (drafts). Only the owner can see or change them.
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null default 'Untitled page',
  data jsonb not null,            -- { theme, settings, blocks }
  slug text,                      -- set when first published
  published boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists pages_owner_idx on public.pages (owner_id, updated_at desc);

-- What buyers see: a frozen copy made when the seller presses Publish.
create table if not exists public.published_pages (
  slug text primary key check (slug ~ '^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$'),
  page_id uuid not null unique references public.pages (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  data jsonb not null,
  published_at timestamptz not null default now()
);

-- Orders placed through a published page (also sent to the seller on WhatsApp).
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.published_pages (slug) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  items jsonb not null,
  shipping jsonb,
  total numeric(10, 2) not null check (total >= 0 and total < 1000000),
  customer jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists orders_owner_idx on public.orders (owner_id, created_at desc);

alter table public.pages enable row level security;
alter table public.published_pages enable row level security;
alter table public.orders enable row level security;

-- pages: owner only
drop policy if exists "own pages" on public.pages;
create policy "own pages" on public.pages for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- published_pages: anyone can read; only the owner writes
drop policy if exists "published are public" on public.published_pages;
create policy "published are public" on public.published_pages for select using (true);
drop policy if exists "owner publishes" on public.published_pages;
create policy "owner publishes" on public.published_pages for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- orders: buyers (anonymous) may add an order to a published page; only the seller reads them
drop policy if exists "buyers place orders" on public.orders;
create policy "buyers place orders" on public.orders for insert to anon, authenticated
  with check (exists (select 1 from public.published_pages p where p.slug = orders.slug and p.owner_id = orders.owner_id));
drop policy if exists "seller reads orders" on public.orders;
create policy "seller reads orders" on public.orders for select using (owner_id = auth.uid());
drop policy if exists "seller deletes orders" on public.orders;
create policy "seller deletes orders" on public.orders for delete using (owner_id = auth.uid());

-- Photos: public to read, each seller writes only inside their own folder (<user id>/...)
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do update set public = true;
drop policy if exists "photos are public" on storage.objects;
create policy "photos are public" on storage.objects for select using (bucket_id = 'photos');
drop policy if exists "sellers upload own photos" on storage.objects;
create policy "sellers upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "sellers delete own photos" on storage.objects;
create policy "sellers delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
