// Copies one room without modifying Supabase or overwriting a Cloudflare room.
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, env } from 'node:process';
import { isDeepStrictEqual } from 'node:util';
import vm from 'node:vm';

const context = { window: {} };
vm.runInNewContext(await readFile(new URL('../config.js', import.meta.url), 'utf8'), context, { timeout: 1000 });
const config = context.window.FUTARI_CONFIG;
const endpoint = env.FUTARI_CLOUDFLARE_URL;
const secret = env.FUTARI_MIGRATION_KEY;
if (!endpoint || !secret || !/^https:\/\//.test(endpoint)) throw Error('Set FUTARI_CLOUDFLARE_URL and FUTARI_MIGRATION_KEY.');
const terminal = createInterface({ input: stdin, output: stdout });
const code = (await terminal.question('futari 방 코드 (입력 내용 표시됨): ')).trim();
terminal.close();
if (code.length < 4 || code.length > 100) throw Error('Invalid room code');
async function source(columns) {
  const url = new URL('/rest/v1/rooms', config.SUPABASE_URL);
  url.searchParams.set('select', columns);
  url.searchParams.set('code', 'eq.' + code);
  const response = await fetch(url, { headers: { apikey: config.SUPABASE_KEY, Authorization: 'Bearer ' + config.SUPABASE_KEY } });
  if (!response.ok) throw Error('Supabase HTTP ' + response.status);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw Error('Room not found or not uniquely accessible');
  return rows[0];
}
const before = await source('data,updated_at');
const headers = { 'X-Room-Code': encodeURIComponent(code), 'Content-Type': 'application/json' };
const result = await fetch(new URL('/import', endpoint), { method: 'POST', headers: { ...headers, 'X-Migration-Key': secret }, body: JSON.stringify({ data: before.data }) });
if (!result.ok) throw Error('Import failed (existing rooms are never overwritten): HTTP ' + result.status);
const verify = await fetch(new URL('/room', endpoint), { headers });
if (!verify.ok) throw Error('Imported room could not be read: HTTP ' + verify.status);
const imported = await verify.json();
if (!isDeepStrictEqual(before.data, imported.data)) throw Error('Data comparison failed. Do not switch the app.');
const after = await source('updated_at');
if (before.updated_at !== after.updated_at) throw Error('Supabase changed during migration. Do not switch the app; reconcile the changes first.');
console.log('Copy verified against source; source unchanged during copy. Supabase remains untouched.');
console.log('Keep writes stopped until cutover; changes after this verification are not copied.');
