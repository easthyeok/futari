const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const path = require('path');
let row = { code: 'test', data: { settings: { me: 'A', you: 'B' }, memories: [] }, updated_at: 'v1' };
let updateCount = 0;
const client = { from() {
  let filters = [], patch, read = false;
  const query = {
    select() { if (!patch) read = true; return query; },
    eq(k,v) { filters.push([k,v]); return query; },
    is(k,v) { filters.push([k,v]); return query; },
    update(data) { patch = data; return query; },
    maybeSingle() { return Promise.resolve({ data: JSON.parse(JSON.stringify(row)) }); },
    then(resolve,reject) {
      assert(!read, 'write query expected');
      const matches = filters.every(([k,v]) => row[k] === v);
      if (matches) { row = {...row, ...patch}; updateCount++; }
      return Promise.resolve({data:matches ? [{updated_at:row.updated_at}] : []}).then(resolve,reject);
    }
  }; return query;
} };
const React = { createElement(){}, useState(){}, useEffect(){}, useRef(){}, useMemo(){} };
const ctx = { window: { React, ReactDOM: {createRoot:()=>({render(){}})}, FutariHome:{HomePage(){}}, FutariGames:{GamePage(){}}, FUTARI_CONFIG:{SUPABASE_URL:'mock',SUPABASE_KEY:'mock'}, supabase:{createClient:()=>client} }, document:{getElementById:()=>({})}, localStorage:{getItem:()=>null}, console };
const source = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replace('  try {\n    ReactDOM.createRoot', '  window.syncTest = {cloudLoad,cloudSave,normalizeData};\n  try {\n    ReactDOM.createRoot');
vm.runInNewContext(source,ctx);
(async()=>{
  const api=ctx.window.syncTest;
  await assert.rejects(api.cloudSave('unknown',{}),/연결/);
  const first=await api.cloudLoad('test');
  assert(first.together && first.settings.you==='B');
  row.updated_at='v2';
  await api.cloudLoad('test',()=>false);
  await assert.rejects(api.cloudSave('test',first),/상대가 먼저/);
  assert.equal(updateCount,0,'rejected read must not advance the local version');
  await api.cloudLoad('test'); await api.cloudSave('test',first);
  assert.equal(updateCount,1);
  row.updated_at='v3'; await assert.rejects(api.cloudSave('test',first),/상대가 먼저/);
  assert.equal(updateCount,1,'concurrent edit must not overwrite remote data');
  row.updated_at=null; await api.cloudLoad('test'); await api.cloudSave('test',first);
  assert.equal(updateCount,2,'legacy null versions are supported');
  console.log('PASS: legacy data normalization, unknown version, rejected stale read, concurrent-write protection, null version');
})().catch(e=>{console.error(e);process.exitCode=1;});
