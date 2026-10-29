-- Small version-checked writes; preserve all untouched records and inline photos.
-- Apply as the room_patch migration. No existing row, policy or role is replaced.
create or replace function public.futari_patch_value(
  target jsonb, patch_path jsonb, patch_value jsonb, remove_value boolean
) returns jsonb language plpgsql immutable security invoker set search_path = '' as $$
declare
  head jsonb;
  tail jsonb;
  field text;
  element_index integer;
  child jsonb;
begin
  if pg_catalog.jsonb_typeof(patch_path) is distinct from 'array'
     or pg_catalog.jsonb_array_length(patch_path) > 32 then
    raise exception 'Invalid patch path' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_array_length(patch_path) = 0 then
    return coalesce(patch_value, 'null'::jsonb);
  end if;
  head := patch_path->0;
  tail := patch_path - 0;
  if pg_catalog.jsonb_typeof(head) = 'string' then
    field := head #>> '{}';
    if field in ('__proto__','prototype','constructor') then
      raise exception 'Unsupported patch key' using errcode = '22023';
    end if;
    target := coalesce(target, '{}'::jsonb);
    if pg_catalog.jsonb_typeof(target) <> 'object' then
      raise exception 'Patch parent is not an object' using errcode = '22023';
    end if;
    if pg_catalog.jsonb_array_length(tail) = 0 then
      if remove_value then return target - field; end if;
      return pg_catalog.jsonb_set(target, array[field], coalesce(patch_value,'null'::jsonb), true);
    end if;
    if remove_value and not (target ? field) then return target; end if;
    child := public.futari_patch_value(target->field, tail, patch_value, remove_value);
    return pg_catalog.jsonb_set(target, array[field], child, true);
  elsif pg_catalog.jsonb_typeof(head) = 'object' and head ? 'id' then
    target := coalesce(target, '[]'::jsonb);
    if pg_catalog.jsonb_typeof(target) <> 'array' then
      raise exception 'Patch parent is not an array' using errcode = '22023';
    end if;
    select (e.ordinality - 1)::integer into element_index
    from pg_catalog.jsonb_array_elements(target) with ordinality as e(value, ordinality)
    where e.value->'id' = head->'id' limit 1;
    if element_index is null then
      if remove_value then return target; end if;
      if pg_catalog.jsonb_array_length(tail) <> 0 or patch_value->'id' is distinct from head->'id' then
        raise exception 'Patch record is missing' using errcode = '22023';
      end if;
      return target || pg_catalog.jsonb_build_array(patch_value);
    end if;
    if pg_catalog.jsonb_array_length(tail) = 0 then
      if remove_value then return target - element_index; end if;
      if patch_value->'id' is distinct from head->'id' then
        raise exception 'Patch record id changed' using errcode = '22023';
      end if;
      return pg_catalog.jsonb_set(target, array[element_index::text], coalesce(patch_value,'null'::jsonb), false);
    end if;
    child := public.futari_patch_value(target->element_index, tail, patch_value, remove_value);
    return pg_catalog.jsonb_set(target, array[element_index::text], child, false);
  end if;
  raise exception 'Unsupported patch path' using errcode = '22023';
end;
$$;

create or replace function public.commit_room_patch(
  room_code text, expected_version timestamptz, patches jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  current_data jsonb;
  current_version timestamptz;
  next_version timestamptz;
  top_key text;
  group_ops jsonb;
  subtree jsonb;
  replacements jsonb := '{}'::jsonb;
  deleted_keys text[] := array[]::text[];
  operation jsonb;
begin
  if room_code is null or room_code = '' or pg_catalog.length(room_code) > 100
     or pg_catalog.jsonb_typeof(patches) is distinct from 'array'
     or pg_catalog.jsonb_array_length(patches) > 2000
     or pg_catalog.pg_column_size(patches) > 16777216 then
    raise exception 'Invalid room patch' using errcode = '22023';
  end if;
  -- The normal rooms RLS policies also apply to this lock and the update below.
  select r.data, r.updated_at into current_data, current_version
  from public.rooms r where r.code = room_code for update;
  if not found then raise exception 'Room not found' using errcode = 'P0002'; end if;
  if current_version is distinct from expected_version then
    return pg_catalog.jsonb_build_object('conflict',true,'version',current_version);
  end if;
  if pg_catalog.jsonb_array_length(patches) = 0 then
    return pg_catalog.jsonb_build_object('version',current_version);
  end if;
  current_data := coalesce(current_data, '{}'::jsonb);
  if pg_catalog.jsonb_typeof(current_data) <> 'object' then raise exception 'Invalid room data' using errcode = '22023'; end if;
  -- Rebuild each changed top-level field separately; don't copy an 8 MB document
  -- for every notification, commit marker or small nested operation.
  for top_key, group_ops in
    select e.value->'path'->>0, pg_catalog.jsonb_agg(e.value order by e.ordinality)
    from pg_catalog.jsonb_array_elements(patches) with ordinality as e(value,ordinality)
    group by e.value->'path'->>0
  loop
    if top_key is null or top_key in ('__proto__','prototype','constructor') then
      raise exception 'Invalid top-level patch key' using errcode = '22023';
    end if;
    subtree := current_data->top_key;
    for operation in select value from pg_catalog.jsonb_array_elements(group_ops)
    loop
      if pg_catalog.jsonb_typeof(operation->'path') is distinct from 'array'
         or pg_catalog.jsonb_array_length(operation->'path') not between 1 and 32
         or pg_catalog.jsonb_typeof(operation->'path'->0) is distinct from 'string'
         or (operation ? 'removed' and pg_catalog.jsonb_typeof(operation->'removed') <> 'boolean')
         or (not coalesce((operation->>'removed')::boolean,false) and not (operation ? 'value')) then
        raise exception 'Invalid patch operation' using errcode = '22023';
      end if;
      if pg_catalog.jsonb_array_length(operation->'path') = 1 and coalesce((operation->>'removed')::boolean,false) then
        subtree := null;
      else
        subtree := public.futari_patch_value(subtree, (operation->'path')-0, operation->'value', coalesce((operation->>'removed')::boolean,false));
      end if;
    end loop;
    if subtree is null then deleted_keys := pg_catalog.array_append(deleted_keys,top_key);
    else replacements := replacements || pg_catalog.jsonb_build_object(top_key,subtree); end if;
  end loop;
  current_data := (current_data - deleted_keys) || replacements;
  next_version := greatest(pg_catalog.clock_timestamp(), current_version + interval '1 microsecond');
  update public.rooms r set data = current_data, updated_at = next_version
  where r.code = room_code and r.updated_at is not distinct from current_version;
  if not found then raise exception 'Room update denied' using errcode = '42501'; end if;
  return pg_catalog.jsonb_build_object('version',next_version);
end;
$$;
revoke all on function public.futari_patch_value(jsonb,jsonb,jsonb,boolean) from public;
revoke all on function public.commit_room_patch(text,timestamptz,jsonb) from public;
grant execute on function public.futari_patch_value(jsonb,jsonb,jsonb,boolean) to anon, authenticated, service_role;
grant execute on function public.commit_room_patch(text,timestamptz,jsonb) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
