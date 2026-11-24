// Rotate an exposed room code without copying the room or printing it in SQL.
import { createHash, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

let oldCode;
if (process.env.FUTARI_CURRENT_ROOM_FILE) {
  oldCode = (await readFile(process.env.FUTARI_CURRENT_ROOM_FILE, 'utf8')).trim();
} else {
  const terminal = createInterface({ input: stdin, output: stdout });
  oldCode = (await terminal.question('기존 방 코드 (입력 내용 표시됨): ')).trim();
  terminal.close();
}
if (oldCode.length < 4 || oldCode.length > 100) throw Error('Invalid room code');
const newCode = (process.env.FUTARI_NEW_ROOM_CODE || randomBytes(18).toString('base64url')).trim();
if (newCode.length < 4 || newCode.length > 100 || newCode === oldCode) throw Error('Invalid new room code');
const digest = value => createHash('sha256').update(value).digest('hex');
const oldHash = digest(oldCode), newHash = digest(newCode);
const secretFile = `.futari-room-code-${Date.now()}`;
await writeFile(secretFile, newCode + '\n', { mode: 0o600, flag: 'wx' });
console.log(`\n새 방 코드를 ${secretFile} 파일에 보관했습니다. 파일 내용은 채팅에 보내지 마세요.`);
const sql = `UPDATE rooms SET room_hash='${newHash}' WHERE room_hash='${oldHash}'`;
const result = spawnSync('npx', ['--yes', 'wrangler', 'd1', 'execute', 'futari-db', '--remote', '--command', sql, '--json'], { encoding: 'utf8' });
if (result.status !== 0) {
  console.error('변경 결과를 확인하지 못했습니다. 코드 파일을 보관하고 이전을 중단하세요.');
  process.exit(1);
}
let changes;
try { changes = JSON.parse(result.stdout)[0].meta.changes; } catch { throw Error('Unable to verify update; retain the new code and stop.'); }
if (changes !== 1) throw Error('Room was not updated; retain the new code and stop.');
console.log('방 코드가 변경되었습니다. 기존 코드는 Cloudflare 방에서 더 이상 사용할 수 없습니다.');
