// Read-only inventory. Room contents and the room code are never printed or saved.
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import vm from 'node:vm';

const configSource = await readFile(new URL('../config.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(configSource, context, { timeout: 1000 });
const { SUPABASE_URL: url, SUPABASE_KEY: key } = context.window.FUTARI_CONFIG || {};
if (!url || !key) throw new Error('Supabase 설정을 찾지 못했습니다.');

const input = createInterface({ input: stdin, output: stdout });
const code = (await input.question('futari 방 코드를 입력하세요 (화면에 입력 내용이 보입니다): ')).trim();
input.close();
if (!code) throw new Error('방 코드가 비어 있습니다.');
const endpoint = new URL('/rest/v1/rooms', url);
endpoint.searchParams.set('select', 'data,updated_at');
endpoint.searchParams.set('code', 'eq.' + code);
const response = await fetch(endpoint, { headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' } });
if (!response.ok) throw new Error('Supabase 조회 실패: HTTP ' + response.status + '. 연결 및 프로젝트 상태를 확인하세요.');
const rows = await response.json();
if (!Array.isArray(rows) || rows.length !== 1 || !rows[0].data) throw new Error('방을 하나만 찾지 못했습니다. 방 코드와 접근 권한을 확인하세요.');
const data = rows[0].data;
let references = 0, inlineBytes = 0;
const unique = new Set();
function inspect(value) {
  if (typeof value === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value)) {
    references++;
    if (!unique.has(value)) {
      unique.add(value);
      inlineBytes += Buffer.from(value.slice(value.indexOf(',') + 1), 'base64').length;
    }
  } else if (Array.isArray(value)) value.forEach(inspect);
  else if (value && typeof value === 'object') Object.values(value).forEach(inspect);
}
inspect(data);
const mb = n => (n / 1024 / 1024).toFixed(2) + ' MiB';
console.log('\n읽기 전용 확인 결과');
console.log('방 JSON 크기:', mb(Buffer.byteLength(JSON.stringify(data))));
console.log('사진 참조:', references, '개 / 중복을 제외한 사진:', unique.size, '개');
console.log('중복을 제외한 사진 원본 크기:', mb(inlineBytes));
console.log('추억:', Array.isArray(data.memories) ? data.memories.length : 0, '개 / 일정:', Array.isArray(data.dates) ? data.dates.length : 0, '개');
console.log('서버 최종 변경 시각:', rows[0].updated_at || '없음');
console.log('원본은 변경하지 않았습니다.');
