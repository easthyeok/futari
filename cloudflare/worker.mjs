import { archivePhotos, restorePhotos } from '../tools/photo-archive.mjs';

const allowed = new Set(['https://easthyeok.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000']);
const encoder = new TextEncoder();
async function hash(value) {
  const digest = await crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
function response(body, status, origin) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (allowed.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}
async function pack(data, bucket, roomHash) {
  const photos = Object.create(null);
  const archive = await archivePhotos(data, async (id, bytes) => {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    photos[id] = btoa(binary);
  });
  const snapshot = JSON.stringify(archive);
  if (encoder.encode(snapshot).length > 1800000) throw Error('Room metadata exceeds D1 safe limit');
  const payload = JSON.stringify(photos);
  const key = `${roomHash}/${await hash(payload)}.json`;
  await bucket.put(key, payload);
  return { snapshot, key };
}
async function unpack(row, bucket) {
  const obj = await bucket.get(row.photo_pack);
  if (!obj) throw Error('Photo pack missing');
  const photos = await obj.json();
  return restorePhotos(JSON.parse(row.snapshot), async id => {
    if (typeof photos[id] !== 'string') throw Error('Photo missing');
    return Uint8Array.from(atob(photos[id]), c => c.charCodeAt(0));
  });
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (origin && !allowed.has(origin)) return response({ error: 'Origin denied' }, 403, origin);
    if (request.method === 'OPTIONS') {
      if (!allowed.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Room-Code, X-Migration-Key', 'Access-Control-Max-Age': '600', Vary: 'Origin' } });
    }
    try {
      const code = decodeURIComponent(request.headers.get('X-Room-Code') || '');
      if (code.length < 4 || code.length > 100) return response({ error: 'Invalid room code' }, 400, origin);
      const roomHash = await hash(code);
      const path = new URL(request.url).pathname;
      if (path === '/room' && request.method === 'GET') {
        const row = await env.DB.prepare('SELECT version, snapshot, photo_pack FROM rooms WHERE room_hash = ?').bind(roomHash).first();
        if (!row) return response({ error: 'Room not found' }, 404, origin);
        if (new URL(request.url).searchParams.get('version') === row.version) return response({ version: row.version, unchanged: true }, 200, origin);
        return response({ version: row.version, data: await unpack(row, env.PHOTOS) }, 200, origin);
      }
      if ((path === '/room' && request.method === 'PUT') || (path === '/import' && request.method === 'POST')) {
        const importing = path === '/import';
        if (importing && (!env.MIGRATION_KEY || request.headers.get('X-Migration-Key') !== env.MIGRATION_KEY)) return response({ error: 'Unauthorized' }, 401, origin);
        const body = await request.json();
        if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data) || (!importing && typeof body.version !== 'string')) return response({ error: 'Invalid snapshot' }, 400, origin);
        const previous = await env.DB.prepare('SELECT version FROM rooms WHERE room_hash = ?').bind(roomHash).first();
        if (importing && previous) return response({ error: 'Room already exists' }, 409, origin);
        if (!importing && (!previous || previous.version !== body.version)) return response({ conflict: true }, 409, origin);
        const archived = await pack(body.data, env.PHOTOS, roomHash);
        const version = crypto.randomUUID();
        const result = importing
          ? await env.DB.prepare('INSERT OR IGNORE INTO rooms (room_hash,version,snapshot,photo_pack) VALUES (?,?,?,?)').bind(roomHash, version, archived.snapshot, archived.key).run()
          : await env.DB.prepare('UPDATE rooms SET version=?,snapshot=?,photo_pack=? WHERE room_hash=? AND version=?').bind(version, archived.snapshot, archived.key, roomHash, body.version).run();
        if (!result.meta.changes) return response({ conflict: true }, 409, origin);
        return response({ version }, 200, origin);
      }
      return response({ error: 'Not found' }, 404, origin);
    } catch (e) {
      console.error('Room request failed', e.message);
      return response({ error: 'Storage operation failed' }, 500, origin);
    }
  }
};
