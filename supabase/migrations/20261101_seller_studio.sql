-- Apply after schema.sql. Adds atomic publishing, history and catalog-validated orders.
-- Keeps the existing Supabase accounts and photo bucket. Safe to re-run.
begin;
alter table public.published_pages add column if not exists active boolean not null default true;
alter table public.orders add column if not exists request_id uuid;
create unique index if not exists orders_request_idx on public.orders(request_id) where request_id is not null;

create table if not exists public.page_releases (
 id uuid primary key default gen_random_uuid(),
 page_id uuid not null references public.pages(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null, data jsonb not null, created_at timestamptz not null default now()
);
create index if not exists page_releases_owner_idx on public.page_releases(owner_id,page_id,created_at desc);
alter table public.page_releases enable row level security;
drop policy if exists "owner reads releases" on public.page_releases;
create policy "owner reads releases" on public.page_releases for select to authenticated using(owner_id=auth.uid());

create table if not exists public.page_activity (
 page_id uuid not null references public.pages(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 day date not null default current_date,
 visits bigint not null default 0, cta bigint not null default 0, whatsapp bigint not null default 0,
 primary key(page_id,day)
);
alter table public.page_activity enable row level security;
drop policy if exists "owner reads activity" on public.page_activity;
create policy "owner reads activity" on public.page_activity for select to authenticated using(owner_id=auth.uid());

-- A page may be taken offline without deleting its publication or orders.
drop policy if exists "published are public" on public.published_pages;
create policy "published are public" on public.published_pages for select using(active or owner_id=auth.uid());
drop policy if exists "owner publishes" on public.published_pages;
drop policy if exists "owner reads publication" on public.published_pages;
create policy "owner reads publication" on public.published_pages for select to authenticated using(owner_id=auth.uid());
-- Only validated RPCs may change publications or insert buyer orders.
drop policy if exists "buyers place orders" on public.orders;

create or replace function public.publish_page(p_page_id uuid,p_slug text,p_name text,p_data jsonb)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare owned public.pages; destination text; order_block jsonb;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select * into owned from public.pages where id=p_page_id and owner_id=auth.uid() for update;
 if not found then raise insufficient_privilege; end if;
 if p_slug !~ '^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$' or p_slug in ('dashboard','edit','login','logout','auth','api','preview','orders','admin','settings','p','_next','favicon') then raise exception 'Invalid page link' using errcode='22023'; end if;
 if owned.slug is not null and owned.slug<>p_slug then raise exception 'The published address must stay the same' using errcode='22023'; end if;
 if jsonb_typeof(p_data->'blocks')<>'array' or octet_length(p_data::text)>4000000 then raise exception 'Invalid page data' using errcode='22023'; end if;
 destination:=regexp_replace(coalesce(p_data#>>'{settings,whatsapp}',''),'[^0-9]','','g');
 if destination !~ '^[0-9]{8,15}$' then raise exception 'Add a valid WhatsApp number' using errcode='22023'; end if;
 select b into order_block from jsonb_array_elements(p_data->'blocks') b where b->>'type'='order' and not coalesce((b->>'hidden')::boolean,false) limit 1;
 if order_block is null or coalesce(jsonb_array_length(order_block#>'{props,items}'),0)=0 then raise exception 'Add products to an order form' using errcode='22023'; end if;
 insert into public.published_pages(slug,page_id,owner_id,name,data,active,published_at) values(p_slug,p_page_id,auth.uid(),left(p_name,120),p_data,true,clock_timestamp())
 on conflict(page_id) do update set name=excluded.name,data=excluded.data,active=true,published_at=excluded.published_at;
 update public.pages set name=left(p_name,120),data=p_data,slug=p_slug,published=true,published_at=clock_timestamp(),updated_at=clock_timestamp() where id=p_page_id;
 insert into public.page_releases(page_id,owner_id,name,data) values(p_page_id,auth.uid(),left(p_name,120),p_data);
 delete from public.page_releases where id in(select id from public.page_releases where page_id=p_page_id order by created_at desc,id desc offset 20);
 return p_slug;
end $$;

create or replace function public.unpublish_page(p_page_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.pages where id=p_page_id and owner_id=auth.uid()) then raise insufficient_privilege; end if;
 update public.published_pages set active=false where page_id=p_page_id and owner_id=auth.uid();
 update public.pages set published=false where id=p_page_id and owner_id=auth.uid();
end $$;

create or replace function public.rollback_page(p_page_id uuid,p_release uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare snapshot public.page_releases;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 perform 1 from public.pages where id=p_page_id and owner_id=auth.uid() for update;
 if not found then raise insufficient_privilege; end if;
 select * into snapshot from public.page_releases where id=p_release and page_id=p_page_id and owner_id=auth.uid();
 if not found then raise exception 'Version not found' using errcode='22023'; end if;
 update public.published_pages set name=snapshot.name,data=snapshot.data,active=true,published_at=clock_timestamp() where page_id=p_page_id and owner_id=auth.uid();
 if not found then raise exception 'Publish this page first' using errcode='22023'; end if;
 update public.pages set published=true,published_at=clock_timestamp() where id=p_page_id;
 insert into public.page_releases(page_id,owner_id,name,data) values(p_page_id,auth.uid(),snapshot.name,snapshot.data);
 delete from public.page_releases where id in(select id from public.page_releases where page_id=p_page_id order by created_at desc,id desc offset 20);
end $$;

create or replace function public.track_page_event(p_slug text,p_event text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare publication public.published_pages;
begin
 if p_event not in('visit','cta','whatsapp') then raise exception 'Invalid event' using errcode='22023'; end if;
 select * into publication from public.published_pages where slug=p_slug and active;
 if not found then return; end if;
 insert into public.page_activity(page_id,owner_id,day,visits,cta,whatsapp) values(publication.page_id,publication.owner_id,current_date,(p_event='visit')::integer,(p_event='cta')::integer,(p_event='whatsapp')::integer)
 on conflict(page_id,day) do update set visits=page_activity.visits+excluded.visits,cta=page_activity.cta+excluded.cta,whatsapp=page_activity.whatsapp+excluded.whatsapp;
end $$;

create or replace function public.place_order(p_slug text,p_form_id text,p_quantities jsonb,p_shipping_index integer,p_customer jsonb,p_request_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare publication public.published_pages; form jsonb; product jsonb; quantities jsonb; item jsonb; items jsonb:='[]'::jsonb; customer jsonb; shipping jsonb; q integer; idx integer:=0; sub numeric:=0; fee numeric:=0; price numeric; result uuid; phone text;
begin
 if p_request_id is null or jsonb_typeof(p_quantities)<>'array' or jsonb_array_length(p_quantities)>100 or octet_length(p_customer::text)>10000 then raise exception 'Invalid checkout' using errcode='22023'; end if;
 select * into publication from public.published_pages where slug=p_slug and active for share;
 if not found then raise exception 'Page is not live' using errcode='22023'; end if;
 -- Retry only returns an existing ID for this exact publication, without exposing another buyer's record.
 select id into result from public.orders where request_id=p_request_id and slug=p_slug;
 if found then return result; end if;
 select b->'props' into form from jsonb_array_elements(publication.data->'blocks') b where b->>'type'='order' and b->>'id'=p_form_id and not coalesce((b->>'hidden')::boolean,false) limit 1;
 if form is null then raise exception 'Order form not found' using errcode='22023'; end if;
 for product in select value from jsonb_array_elements(form->'items') loop
  if coalesce(p_quantities->>idx,'0') !~ '^[0-9]{1,3}$' then raise exception 'Invalid quantity' using errcode='22023'; end if;
  q:=(coalesce(p_quantities->>idx,'0'))::integer;idx:=idx+1;
  price:=coalesce((product->>'price')::numeric,0);
  if price<0 or price>=1000000 then raise exception 'Invalid product price' using errcode='22023'; end if;
  if q>0 then items:=items||jsonb_build_array(jsonb_build_object('name',left(product->>'name',120),'price',price,'qty',q));sub:=sub+price*q;end if;
 end loop;
 if jsonb_array_length(items)=0 then raise exception 'Choose a product' using errcode='22023'; end if;
 if jsonb_array_length(coalesce(form->'shipping','[]'::jsonb))>0 then
  if p_shipping_index is null or p_shipping_index<0 or p_shipping_index>=jsonb_array_length(form->'shipping') then raise exception 'Invalid delivery option' using errcode='22023';end if;
  shipping:=form->'shipping'->p_shipping_index;fee:=greatest(0,coalesce((shipping->>'fee')::numeric,0));
  if coalesce((form->>'freeShipMin')::numeric,0)>0 and sub>=(form->>'freeShipMin')::numeric then fee:=0;end if;
  shipping:=jsonb_build_object('label',left(shipping->>'label',120),'fee',fee,'pickup',coalesce((shipping->>'pickup')::boolean,false));
 end if;
 phone:=left(trim(coalesce(p_customer->>'phone','')),40);
 if trim(coalesce(p_customer->>'name',''))='' or phone !~ '^[+()0-9 -]{8,25}$' or length(regexp_replace(phone,'[^0-9]','','g')) not between 8 and 15 then raise exception 'Invalid customer details' using errcode='22023';end if;
 if coalesce((form->>'askAddress')::boolean,false) and not coalesce((shipping->>'pickup')::boolean,false) and trim(coalesce(p_customer->>'address',''))='' then raise exception 'Address is required' using errcode='22023';end if;
 if coalesce((form->>'askSchedule')::boolean,false) and (coalesce(p_customer->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or coalesce(p_customer->>'time','') !~ '^[0-9]{2}:[0-9]{2}$' or ((p_customer->>'date')::date+(p_customer->>'time')::time) <= (now() at time zone 'Asia/Kuala_Lumpur')) then raise exception 'Choose a future appointment' using errcode='22023';end if;
 if coalesce(form->>'variants','')<>'' and not exists(select 1 from regexp_split_to_table(form->>'variants',',') v where trim(v)=trim(coalesce(p_customer->>'variant',''))) then raise exception 'Invalid variant' using errcode='22023';end if;
 customer:=jsonb_build_object('name',left(trim(p_customer->>'name'),120),'phone',phone,'address',case when coalesce((shipping->>'pickup')::boolean,false) then '' else left(coalesce(p_customer->>'address',''),500) end,'note',left(coalesce(p_customer->>'note',''),500),'variant',left(coalesce(p_customer->>'variant',''),120),'date',left(coalesce(p_customer->>'date',''),10),'time',left(coalesce(p_customer->>'time',''),5));
 if sub+fee>=1000000 then raise exception 'Order value is too large' using errcode='22023';end if;
 insert into public.orders(slug,owner_id,items,shipping,total,customer,request_id) values(p_slug,publication.owner_id,items,shipping,round(sub+fee,2),customer,p_request_id)
 on conflict(request_id) where request_id is not null do nothing returning id into result;
 if result is null then select id into result from public.orders where request_id=p_request_id and slug=p_slug;end if;
 return result;
end $$;

revoke all on function public.publish_page(uuid,text,text,jsonb),public.unpublish_page(uuid),public.rollback_page(uuid,uuid) from public,anon;
grant execute on function public.publish_page(uuid,text,text,jsonb),public.unpublish_page(uuid),public.rollback_page(uuid,uuid) to authenticated;
revoke all on function public.place_order(text,text,jsonb,integer,jsonb,uuid),public.track_page_event(text,text) from public;
grant execute on function public.place_order(text,text,jsonb,integer,jsonb,uuid),public.track_page_event(text,text) to anon,authenticated;
grant select on public.page_releases,public.page_activity to authenticated;
commit;
