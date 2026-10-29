begin;
set local role anon;
do $$
declare
  fixture_code text := '_patch_test_' || pg_catalog.pg_backend_pid()::text;
  original jsonb;
  actual jsonb;
  before_version timestamptz := '2020-01-01T00:00:00Z';
  result jsonb;
  next_version timestamptz;
  started timestamptz;
  memory_id jsonb;
  old_memory jsonb;
begin
  -- Clone only inside this rolled-back transaction, never edit a real room.
  select data into original from public.rooms order by pg_catalog.pg_column_size(data) desc limit 1;
  original := coalesce(original, '{}'::jsonb) || '{"_patch_test":{"records":[{"id":"a","title":"before","photo":"keep"},{"id":"b","title":"remove"}],"keep":{"unknown":true}}}'::jsonb;
  insert into public.rooms(code,data,updated_at) values (fixture_code,original,before_version);
  started := pg_catalog.clock_timestamp();
  result := public.commit_room_patch(fixture_code,before_version,'[
    {"path":["_patch_test","records",{"id":"a"},"title"],"value":"after"},
    {"path":["_patch_test","records",{"id":"b"}],"removed":true},
    {"path":["_patch_test","records",{"id":"c"}],"value":{"id":"c","title":"new"}},
    {"path":["_patch_test","newDefault","nested"],"value":true},
    {"path":["commits","patch-test"],"value":true}
  ]'::jsonb);
  assert pg_catalog.clock_timestamp() - started < interval '3 seconds', 'Small patch on the large document must finish within the existing anon timeout';
  next_version := (result->>'version')::timestamptz;
  assert next_version > before_version, 'Server must advance the version';
  select data into actual from public.rooms where code=fixture_code;
  assert actual#>>'{_patch_test,records,0,title}' = 'after';
  assert actual#>>'{_patch_test,records,0,photo}' = 'keep';
  assert actual#>>'{_patch_test,records,1,id}' = 'c';
  assert actual#>>'{_patch_test,newDefault,nested}' = 'true';
  assert actual#>'{_patch_test,keep}' = original#>'{_patch_test,keep}', 'Unknown fields must survive';
  assert (actual->'memories') is not distinct from (original->'memories'), 'All existing memory photos must survive';
  assert (actual->'dates') is not distinct from (original->'dates'), 'All existing schedules/photos must survive';
  memory_id := actual#>'{memories,0,id}';
  if memory_id is not null then
    old_memory := actual#>'{memories,0}';
    started := pg_catalog.clock_timestamp();
    result := public.commit_room_patch(fixture_code,next_version,pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'path',pg_catalog.jsonb_build_array('memories',pg_catalog.jsonb_build_object('id',memory_id),'title'),
      'value','patch verification title'
    )));
    assert pg_catalog.clock_timestamp() - started < interval '3 seconds', 'Editing a record in the large photo array must stay under the existing timeout';
    next_version := (result->>'version')::timestamptz;
    select data into actual from public.rooms where code=fixture_code;
    assert actual#>>'{memories,0,title}' = 'patch verification title';
    assert (actual#>'{memories,0}') - 'title' = old_memory - 'title', 'Editing a title must not change any photo or unknown record field';
  end if;
  result := public.commit_room_patch(fixture_code,before_version,'[{"path":["_patch_test","records",{"id":"a"},"title"],"value":"stale"}]');
  assert result->>'conflict' = 'true', 'Stale client must be rejected';
  assert (select data from public.rooms where code=fixture_code) = actual;
  result := public.commit_room_patch(fixture_code,next_version,'[]');
  assert (result->>'version')::timestamptz = next_version, 'Empty patch is a no-op';
  begin
    perform public.commit_room_patch(fixture_code,next_version,'[{"path":["__proto__"],"value":{}}]');
    raise exception 'Unsafe patch unexpectedly accepted';
  exception when invalid_parameter_value then null; end;
  assert (select data from public.rooms where code=fixture_code) = actual;
  -- Missing legacy defaults can be materialized without replacing the whole room.
  assert public.futari_patch_value(null,'["newArray",{"id":"x"}]','{"id":"x","value":1}',false) = '{"newArray":[{"id":"x","value":1}]}'::jsonb;
  -- Reordered id lookups, nulls, removals and sibling operations are independent.
  assert public.futari_patch_value('{"list":[{"id":"b"},{"id":"a","title":"old"}]}','["list",{"id":"a"},"title"]','"new"',false)#>>'{list,1,title}' = 'new';
  assert public.futari_patch_value('{"x":1}','["x"]','null',false) = '{"x":null}'::jsonb;
  assert public.futari_patch_value('{"x":1}','["x"]',null,true) = '{}'::jsonb;
  assert public.futari_patch_value('[]','[{"id":"missing"}]',null,true) = '[]'::jsonb;
end;
$$;
rollback;
select 'PASS: anon/RLS patch writes, large-room write under 3 seconds, photo/unknown-field preservation, id edits/add/remove, missing defaults, nulls, no-op and stale CAS; all test rows rolled back' as result;
