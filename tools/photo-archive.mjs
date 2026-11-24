// Losslessly separate inline images from a room snapshot. The returned manifest
// belongs to the archive format, not to the app's room data schema.
const photoPattern = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/]*={0,2})$/i;

export async function archivePhotos(data, put) {
  const images = new Map();
  const paths = [];
  async function walk(value, path) {
    if (typeof value === 'string') {
      const match = photoPattern.exec(value);
      if (!match) return value;
      // Canonical base64 only: otherwise decoding and encoding could alter data.
      const bytes = Uint8Array.from(atob(match[2]), ch => ch.charCodeAt(0));
      let encoded = '';
      for (let i = 0; i < bytes.length; i += 32768) encoded += String.fromCharCode(...bytes.subarray(i, i + 32768));
      if (btoa(encoded) !== match[2]) throw Error('Unsupported noncanonical image encoding');
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const id = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      const ref = `${match[1]}:${id}`;
      if (!images.has(ref)) { await put(id, bytes, match[1]); images.set(ref, true); }
      paths.push({ path, id, mime: match[1] });
      return null;
    }
    if (Array.isArray(value)) {
      const out = [];
      for (let i = 0; i < value.length; i++) out.push(await walk(value[i], path.concat(i)));
      return out;
    }
    if (value && typeof value === 'object') {
      const out = Object.create(null);
      for (const [key, child] of Object.entries(value)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) throw Error('Unsupported data key');
        out[key] = await walk(child, path.concat(key));
      }
      return out;
    }
    return value;
  }
  const snapshot = await walk(data, []);
  return { format: 1, snapshot, photos: paths };
}

export async function restorePhotos(archive, get) {
  if (archive.format !== 1 || !Array.isArray(archive.photos)) throw Error('Unsupported archive');
  const snapshot = JSON.parse(JSON.stringify(archive.snapshot));
  const cache = new Map();
  for (const entry of archive.photos) {
    if (!Array.isArray(entry.path) || !entry.path.length || !/^[a-f0-9]{64}$/.test(entry.id) || !/^image\/[a-z0-9.+-]+$/i.test(entry.mime)) throw Error('Invalid photo reference');
    const cacheKey = entry.mime + ':' + entry.id;
    if (!cache.has(cacheKey)) {
      const bytes = new Uint8Array(await get(entry.id));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (actual !== entry.id) throw Error('Photo checksum mismatch');
      let binary = '';
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      cache.set(cacheKey, `data:${entry.mime};base64,${btoa(binary)}`);
    }
    let target = snapshot;
    for (const part of entry.path.slice(0, -1)) {
      if ((typeof part !== 'string' && !Number.isInteger(part)) || ['__proto__', 'prototype', 'constructor'].includes(part) || !target || !Object.hasOwn(target, part)) throw Error('Invalid photo path');
      target = target[part];
    }
    const last = entry.path.at(-1);
    if (['__proto__', 'prototype', 'constructor'].includes(last) || !target || !Object.hasOwn(target, last) || target[last] !== null) throw Error('Invalid photo target');
    target[last] = cache.get(cacheKey);
  }
  return snapshot;
}
