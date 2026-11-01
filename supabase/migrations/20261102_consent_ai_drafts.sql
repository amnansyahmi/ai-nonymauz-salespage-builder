-- Apply after 20261101_seller_studio.sql. Orders are saved only with the buyer's consent
-- and only when the shop keeps orders (settings.captureOrders, on by default).
-- Also adds the hourly allowance for AI copy drafts. Safe to re-run.
begin;
create or replace function public.place_order(p_slug text,p_form_id text,p_quantities jsonb,p_shipping_index integer,p_customer jsonb,p_request_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare publication public.published_pages; form jsonb; product jsonb; quantities jsonb; item jsonb; items jsonb:='[]'::jsonb; customer jsonb; shipping jsonb; q integer; idx integer:=0; sub numeric:=0; fee numeric:=0; price numeric; result uuid; phone text;
begin
 if p_request_id is null or jsonb_typeof(p_quantities)<>'array' or jsonb_array_length(p_quantities)>100 or octet_length(p_customer::text)>10000 then raise exception 'Invalid checkout' using errcode='22023'; end if;
 select * into publication from public.published_pages where slug=p_slug and active for share;
 if not found then raise exception 'Page is not live' using errcode='22023'; end if;
 -- PDPA: only keep buyer details when the shop saves orders and the buyer ticked the consent box.
 if coalesce(publication.data->'settings'->>'captureOrders','true')='false' then raise exception 'This shop does not save orders' using errcode='22023'; end if;
 if coalesce(p_customer->>'consent','')<>'true' then raise exception 'Buyer consent is required' using errcode='22023'; end if;
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
 customer:=jsonb_build_object('name',left(trim(p_customer->>'name'),120),'phone',phone,'address',case when coalesce((shipping->>'pickup')::boolean,false) then '' else left(coalesce(p_customer->>'address',''),500) end,'note',left(coalesce(p_customer->>'note',''),500),'variant',left(coalesce(p_customer->>'variant',''),120),'date',left(coalesce(p_customer->>'date',''),10),'time',left(coalesce(p_customer->>'time',''),5),'consentAt',now());
 if sub+fee>=1000000 then raise exception 'Order value is too large' using errcode='22023';end if;
 insert into public.orders(slug,owner_id,items,shipping,total,customer,request_id) values(p_slug,publication.owner_id,items,shipping,round(sub+fee,2),customer,p_request_id)
 on conflict(request_id) where request_id is not null do nothing returning id into result;
 if result is null then select id into result from public.orders where request_id=p_request_id and slug=p_slug;end if;
 return result;
end $$;
revoke all on function public.place_order(text,text,jsonb,integer,jsonb,uuid) from public;
grant execute on function public.place_order(text,text,jsonb,integer,jsonb,uuid) to anon,authenticated;
-- AI copy drafts: a per-seller hourly allowance, claimed through one RPC so it cannot be backdated or reset.
create table if not exists public.ai_drafts (
 id bigserial primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index if not exists ai_drafts_owner_idx on public.ai_drafts(owner_id,created_at);
alter table public.ai_drafts enable row level security;
revoke all on public.ai_drafts from anon,authenticated;
create or replace function public.claim_ai_draft(p_limit integer default 10)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare me uuid:=auth.uid(); used integer;
begin
 if me is null then raise exception 'Log in first' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext('ai_drafts:'||me::text));
 select count(*) into used from public.ai_drafts where owner_id=me and created_at>now()-interval '1 hour';
 if used>=least(greatest(coalesce(p_limit,10),1),30) then return false; end if;
 insert into public.ai_drafts(owner_id) values(me);
 delete from public.ai_drafts where owner_id=me and created_at<now()-interval '1 day';
 return true;
end $$;
revoke all on function public.claim_ai_draft(integer) from public,anon;
grant execute on function public.claim_ai_draft(integer) to authenticated;
commit;
