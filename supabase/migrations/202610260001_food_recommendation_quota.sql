-- Dedicated usage rows; existing rooms/data are never changed.
create table if not exists public.food_recommendation_usage (
  scope text primary key,
  usage_day date not null default current_date,
  requests integer not null default 0 check (requests >= 0),
  last_request timestamptz
);
alter table public.food_recommendation_usage enable row level security;
revoke all on public.food_recommendation_usage from anon, authenticated;

create or replace function public.consume_food_recommendation(room_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  today_utc date := (pg_catalog.now() at time zone 'UTC')::date;
  global_usage public.food_recommendation_usage%rowtype;
  room_usage public.food_recommendation_usage%rowtype;
  room_scope text := 'room:' || room_hash;
begin
  if room_hash is null or room_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  insert into public.food_recommendation_usage(scope) values ('global') on conflict do nothing;
  -- Always take the global row first, serializing the room/global budget atomically.
  select * into global_usage from public.food_recommendation_usage where scope = 'global' for update;
  insert into public.food_recommendation_usage(scope) values (room_scope) on conflict do nothing;
  select * into room_usage from public.food_recommendation_usage where scope = room_scope for update;
  if (global_usage.usage_day = today_utc and global_usage.requests >= 100)
     or (room_usage.usage_day = today_utc and room_usage.requests >= 20)
     or room_usage.last_request > pg_catalog.now() - interval '10 seconds' then return false; end if;
  update public.food_recommendation_usage
    set requests = case when usage_day = today_utc then requests + 1 else 1 end,
        usage_day = today_utc, last_request = pg_catalog.now()
    where scope in ('global', room_scope);
  return true;
end;
$$;
revoke all on function public.consume_food_recommendation(text) from public, anon, authenticated;
grant execute on function public.consume_food_recommendation(text) to service_role;
