import assert from 'node:assert/strict';
import { archivePhotos, restorePhotos } from '../tools/photo-archive.mjs';

const photo = 'data:image/jpeg;base64,' + btoa('a real image payload');
const original = { memories: [{ photo, photos: [photo] }], extra: { note: 'kept', nil: null } };
const objects = new Map();
const archive = await archivePhotos(original, async (id, bytes) => objects.set(id, bytes));
assert.equal(objects.size, 1);
assert.equal(archive.photos.length, 2);
assert.equal(archive.snapshot.memories[0].photo, null);
assert.deepEqual(await restorePhotos(archive, async id => objects.get(id)), original);
assert.equal(original.memories[0].photo, photo);
await assert.rejects(restorePhotos(archive, async () => new Uint8Array([1])), /checksum/);
await assert.rejects(archivePhotos(JSON.parse('{"__proto__":{}}'), async () => {}), /Unsupported/);
console.log('PASS: photo extraction, deduplication, lossless recovery and corruption detection');
