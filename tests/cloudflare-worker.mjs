import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';

const rooms = new Map(), objects = new Map();
const DB = { prepare(sql) { return { bind(...v) { return {
  async first() { const row = rooms.get(v[0]); return row ? { ...row } : null; },
  async run() {
    if (sql.startsWith('INSERT')) {
      if (rooms.has(v[0])) return { meta: { changes: 0 } };
      rooms.set(v[0], { version: v[1], snapshot: v[2], photo_pack: v[3] });
    } else {
      const row = rooms.get(v[3]);
      if (!row || row.version !== v[4]) return { meta: { changes: 0 } };
      rooms.set(v[3], { version: v[0], snapshot: v[1], photo_pack: v[2] });
    }
    return { meta: { changes: 1 } };
  }
}; } }; } };
const PHOTOS = { async put(key, payload) { objects.set(key, payload); }, async get(key) { return objects.has(key) ? { json: async () => JSON.parse(objects.get(key)) } : null; } };
const env = { DB, PHOTOS, MIGRATION_KEY: 'secret' };
const code = encodeURIComponent('우리방123');
const photo = 'data:image/jpeg;base64,' + btoa('photo');
const data = { memories: [{ id: 'm', photo }], commits: {} };
async function call(path, method = 'GET', body, extra = {}) {
  return worker.fetch(new Request('https://example.test' + path, { method, headers: { 'X-Room-Code': code, ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
}
assert.equal((await call('/import', 'POST', { data })).status, 401);
let res = await call('/import', 'POST', { data }, { 'X-Migration-Key': 'secret' });
assert.equal(res.status, 200);
let version = (await res.json()).version;
assert.equal((await call('/import', 'POST', { data }, { 'X-Migration-Key': 'secret' })).status, 409);
res = await call('/room');
assert.deepEqual((await res.json()).data, data);
res = await call('/room?version=' + version);
assert.equal((await res.json()).unchanged, true);
assert.equal((await call('/room', 'PUT', { data, version: 'stale' })).status, 409);
const edited = { ...data, note: 'saved' };
res = await call('/room', 'PUT', { data: edited, version });
assert.equal(res.status, 200);
version = (await res.json()).version;
assert.equal((await (await call('/room')).json()).data.note, 'saved');
assert.equal(objects.size, 1);
assert.equal((await call('/room', 'PUT', { data, version: 'stale' })).status, 409);
assert.equal((await call('/room', 'GET', null, { Origin: 'https://attacker.example' })).status, 403);
console.log('PASS: private import, lossless photos, version checks, conflict and origin handling');
